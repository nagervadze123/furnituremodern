// First-party Real User Monitoring (RUM) endpoint.
//
// The browser-side reporter (components/web-vitals-reporter.tsx) posts
// one row per Core Web Vital metric (LCP, INP, CLS, FCP, TTFB) at the
// natural reporting moments — see useReportWebVitals semantics. The
// handler stores anonymous aggregate-safe rows in public.web_vitals.
//
// Consent contract:
//   • Third-party analytics (GA4/GTM/Meta/Plausible) only fires after
//     the visitor accepts the cookie banner (handled by track() in
//     lib/analytics).
//   • This first-party RUM endpoint runs WITHOUT analytics consent —
//     because the row stores no PII (no IP, no full UA, no cookies,
//     no session id). What lands in the row: metric name, value,
//     rating, pathname, optional locale + navigation_type +
//     effective_connection_type, and a 3-bucket device_type derived
//     from the User-Agent then immediately discarded. This is the
//     same posture as a server-side log line summarizing a request.
//   • If Sec-GPC: 1 or DNT: 1 is set, the request is rate-limited and
//     bot-filtered as usual but never inserted — even anonymous
//     aggregates are skipped to honor the signal.
//
// Hardening:
//   • POST only. force-dynamic so Next never tries to cache.
//   • 4KB payload cap (413).
//   • Bot UAs return 204 silently — 403 would tip off scrapers.
//   • Per-IP rate limit (60/min) shared with /api/log-404's pattern.
//   • Per-metric extreme-value sanity drop (silent).
//   • No-ops gracefully (204) if Supabase env is missing.
//   • Insert errors become 204 ok-no-content; never breaks the user.
//   • One log per minute per error class — no high-volume noise.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createRateLimiter } from "@/lib/api/log-404";
import {
  VitalsPayloadSchema,
  isBotUserAgent,
  isWithinSanity,
  deriveDeviceType,
  sanitizePathname,
  honorsPrivacySignal,
} from "@/lib/api/vitals";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;

// 60 requests per minute per IP. Shared shape with /api/log-404 (30/min)
// — RUM gets a higher ceiling because a single page emits up to 5
// beacons (LCP/INP/CLS/FCP/TTFB). At 5 metrics × 12 page views/min the
// budget is 60.
const withinRateLimit = createRateLimiter({ max: 60, windowMs: 60_000 });

// One-error-per-minute logging. Map keyed by error class → next-allowed
// log timestamp. Prevents a flood of failed inserts (e.g. brief DB
// outage) from filling the function logs.
const lastLoggedAt = new Map<string, number>();
function logOncePerMinute(key: string, message: string, err: unknown): void {
  const now = Date.now();
  const next = lastLoggedAt.get(key) ?? 0;
  if (now < next) return;
  lastLoggedAt.set(key, now + 60_000);
  console.warn(`[api/vitals] ${message}`, err);
}

// 204 No Content — used for every silent reject path so the browser
// beacon doesn't retry and so scrapers can't tell ok from drop.
const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent");

  // 1. Bot drop. Silent 204 — 403 would tip off scrapers that we filter.
  if (isBotUserAgent(userAgent)) return noContent();

  // 2. Rate limit. Bucket by client IP; "unknown" is a single shared
  //    bucket so a missing X-Forwarded-For doesn't grant infinite reqs.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!withinRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 }
    );
  }

  // 3. Body size cap. Read as text first so we never trust client-set
  //    Content-Length. 4KB is generous for any single-metric beacon.
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (bodyText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  // 4. JSON parse + Zod validate.
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const parsed = VitalsPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }
  const payload = parsed.data;

  // 5. Per-metric extreme-value sanity. Silent 204 — looks identical to
  //    a successful insert. CLS > 5 or LCP > 60s is corrupt/synthetic.
  if (!isWithinSanity(payload.name, payload.value)) return noContent();

  // 6. Privacy signal honored (Sec-GPC / DNT). We've already absorbed
  //    the rate-limit cost so a hostile client can't bypass throttling
  //    by setting these — but no row lands.
  if (honorsPrivacySignal(request.headers)) return noContent();

  // 7. No-op when Supabase env is missing. Public pages must keep
  //    rendering even if RUM storage is offline — caller doesn't care.
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noContent();
  }

  // 8. Bucket the UA into a 3-value device_type, then discard the raw
  //    string. This is the only privacy-relevant bit we keep from the
  //    User-Agent header.
  const deviceType = deriveDeviceType(userAgent);

  // 9. Insert. Errors are swallowed — RUM is best-effort observability,
  //    not transactional. We still log the first failure per minute
  //    per error class so a real outage gets a signal in the logs.
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("web_vitals").insert({
      metric: payload.name,
      value: payload.value,
      rating: payload.rating,
      path: sanitizePathname(payload.pathname),
      locale: payload.locale ?? null,
      navigation_type: payload.navigation_type ?? null,
      effective_connection_type: payload.effective_connection_type ?? null,
      device_type: deviceType,
    });
    if (error) {
      logOncePerMinute(`db:${error.code ?? "unknown"}`, "insert failed", error);
      return noContent();
    }
  } catch (err) {
    logOncePerMinute("db:exception", "exception during insert", err);
    return noContent();
  }

  return noContent();
}
