// Pure helpers for /api/vitals. Lifted into lib/ so they can be unit
// tested without spinning up a Next.js request — the route file itself
// stays a thin POST handler.
//
// Privacy contract enforced here:
//   • Pathname capped to 2048 chars and stripped of query string.
//   • Metric name + rating constrained to enums.
//   • Numeric value must be finite. Per-metric extreme caps reject
//     bogus values that are almost certainly bugs/attacks.
//   • Raw User-Agent is never persisted; we extract a 3-bucket
//     device_type ("mobile" | "tablet" | "desktop") and discard.
//   • Bot UAs are filtered before any DB insert.

import { z } from "zod";

export type MetricName = "CLS" | "INP" | "LCP" | "FCP" | "TTFB";

export const MetricNameEnum = z.enum(["CLS", "INP", "LCP", "FCP", "TTFB"]);
export const RatingEnum = z.enum(["good", "needs-improvement", "poor"]);

// Per-metric upper bound. Anything above is dropped silently. Units:
//   CLS is unitless (cumulative shift score). 5 is wildly poor and any
//     value above is corrupt/synthetic.
//   LCP/FCP/INP/TTFB are milliseconds. 60s is far worse than the
//     "poor" thresholds and indicates a stalled reporter or injection.
const MAX_VALUES: Record<MetricName, number> = {
  CLS: 5,
  LCP: 60_000,
  FCP: 60_000,
  INP: 60_000,
  TTFB: 60_000,
};

// Strip the query string and clamp length to 2048. The spec is to never
// store full URLs containing personal data — query strings can carry
// search terms, email tokens, share params, etc.
export function sanitizePathname(input: string): string {
  const noQuery = input.split("?")[0]?.split("#")[0] ?? "";
  return noQuery.slice(0, 2048);
}

// Wire payload as posted by the reporter (sendBeacon Blob or fetch JSON).
// All optional fields use `.optional()` not `.nullable().optional()` so
// the reporter can simply omit them when unavailable.
export const VitalsPayloadSchema = z.object({
  name: MetricNameEnum,
  value: z
    .number()
    .refine((n) => Number.isFinite(n), { message: "value must be finite" }),
  rating: RatingEnum,
  delta: z
    .number()
    .refine((n) => Number.isFinite(n), { message: "delta must be finite" })
    .optional(),
  id: z.string().min(1).max(128).optional(),
  pathname: z.string().min(1).max(4096),
  locale: z.enum(["ka", "en"]).optional(),
  navigation_type: z.string().max(32).optional(),
  effective_connection_type: z.string().max(16).optional(),
});
export type VitalsPayload = z.infer<typeof VitalsPayloadSchema>;

// True when the value falls within the per-metric sanity range.
// Reject silently (return 204) when false — see the route handler.
export function isWithinSanity(name: MetricName, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  return value <= MAX_VALUES[name];
}

// ---------------------------------------------------------------------------
// Bot detection.
// ---------------------------------------------------------------------------
// One regex against a curated list of crawler UA tokens. Cheap, no
// external dependency. We match case-insensitively. The trailing
// `\bbot\b` catches generic "FooBot" UAs without colliding with
// product names like "iBot" or "Hubot" because those don't have a
// word boundary after "bot".
//
// We deliberately don't try to identify every crawler — the goal is
// to drop obvious traffic that would skew p75. A few unfiltered bots
// are tolerable; admin-only data, no public API.
const BOT_REGEX =
  /Googlebot|Bingbot|YandexBot|DuckDuckBot|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Applebot|PinterestBot|AhrefsBot|SemrushBot|MJ12bot|DotBot|crawler|spider|\bbot\b/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_REGEX.test(ua);
}

// ---------------------------------------------------------------------------
// User-Agent → device bucket. 3 outcomes only, no fingerprinting.
// ---------------------------------------------------------------------------
// Order matters:
//   1. iPad explicitly first (matches "iPad" or modern iPad UAs that
//      report "Macintosh"+touch — we accept the false-negatives there
//      since 3 buckets is good enough for performance segmentation).
//   2. Tablet keyword for Android tablets that don't include "Mobile".
//   3. Mobile detected by "Mobile" token, "iPhone", "iPod", or
//      Android-with-Mobile.
//   4. Default: desktop.
//
// `null` is returned when there is no UA at all (sendBeacon strips
// it sometimes); the caller stores null instead of guessing.
export function deriveDeviceType(
  ua: string | null | undefined
): "mobile" | "tablet" | "desktop" | null {
  if (!ua) return null;
  if (/iPad/i.test(ua)) return "tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/Tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

// ---------------------------------------------------------------------------
// Privacy headers.
// ---------------------------------------------------------------------------
// Honor Global Privacy Control (Sec-GPC) and DNT. When either is set
// the request still gets validated and rate-limited (so a hostile
// client can't bypass throttling by setting DNT) but the row is not
// inserted.
export function honorsPrivacySignal(headers: Headers): boolean {
  return headers.get("sec-gpc") === "1" || headers.get("dnt") === "1";
}
