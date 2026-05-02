"use client";

// Client-side Real User Monitoring beacon.
//
// Mounted once at the locale layout level. On every Core Web Vital
// metric (LCP / INP / CLS / FCP / TTFB), this component does two
// things:
//
//   1. Posts a tiny JSON beacon to /api/vitals (first-party, anonymous,
//      runs without consent — see the route handler's top comment for
//      the privacy contract).
//   2. Calls track({ type: "web_vitals", ... }) which fans out to GA4 /
//      GTM / Plausible only after the visitor accepts the cookie
//      banner. Meta is intentionally a no-op for this event.
//
// Next.js's useReportWebVitals (from next/web-vitals) is the official
// integration with the web-vitals library. The library handles the
// timing semantics for us — INP and CLS are reported on visibilitychange
// → "hidden" / pagehide, with the final accumulated value, while LCP /
// FCP / TTFB report at their natural settling moments. Each metric
// fires our callback at most once per page lifetime.
//
// The handler is defined at module scope so its reference is stable
// across renders — required to avoid duplicate metric reports per
// the Next docs.

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/analytics";
import type { WebVitalsMetricName } from "@/lib/analytics/types";

const VITALS_ENDPOINT = "/api/vitals";

const ALLOWED_METRICS: ReadonlySet<string> = new Set([
  "CLS",
  "INP",
  "LCP",
  "FCP",
  "TTFB",
]);

// 0..1 sampling rate. Default 1 (capture every event). Per-event
// sampling is the simplest correct strategy at low traffic; we
// document session-based sampling as a future option in CHECKLIST.md.
function readSampleRate(): number {
  const raw = process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
  const n = raw === undefined || raw === "" ? 1 : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}
const SAMPLE_RATE = readSampleRate();

function stripQuery(p: string): string {
  const i = p.indexOf("?");
  const noQuery = i === -1 ? p : p.slice(0, i);
  const h = noQuery.indexOf("#");
  return h === -1 ? noQuery : noQuery.slice(0, h);
}

function inferLocaleFromPath(pathname: string): string | undefined {
  if (pathname === "/ka" || pathname.startsWith("/ka/")) return "ka";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return undefined;
}

// navigator.connection is present on Chromium, restricted in privacy-
// hardened browsers (Safari, Firefox by default). When missing we
// simply omit the field — the route handler stores null.
function effectiveConnectionType(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const c = (navigator as unknown as { connection?: { effectiveType?: unknown } })
    .connection;
  return typeof c?.effectiveType === "string" ? c.effectiveType : undefined;
}

// sendBeacon is the right primitive for unload-time reporting — the
// browser queues it and continues delivery after the page unloads.
// When sendBeacon is unavailable or rejects (queue limits, network
// teardown), fall back to fetch with keepalive so the request still
// rides through the unload window.
function sendBeacon(body: string): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(VITALS_ENDPOINT, blob)) return;
    } catch {
      // sendBeacon throws if Blob/quota fails — fall through to fetch.
    }
  }
  if (typeof fetch === "function") {
    void fetch(VITALS_ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {
      /* swallow — RUM is best-effort */
    });
  }
}

// `Metric` is the shape passed by useReportWebVitals. We type it
// minimally rather than importing from next/web-vitals so the file
// stays decoupled from upstream type churn.
type ReportedMetric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType?: string;
};

const handleWebVitals = (metric: ReportedMetric): void => {
  if (!ALLOWED_METRICS.has(metric.name)) return;
  if (SAMPLE_RATE < 1 && Math.random() >= SAMPLE_RATE) return;

  const rawPath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const pathname = stripQuery(rawPath);
  const locale = inferLocaleFromPath(pathname);
  const ect = effectiveConnectionType();

  // First-party RUM beacon — anonymous, no consent required.
  sendBeacon(
    JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      pathname,
      locale,
      navigation_type: metric.navigationType,
      effective_connection_type: ect,
    })
  );

  // Third-party analytics fan-out. track() is a no-op until the
  // visitor accepts the cookie banner.
  track({
    type: "web_vitals",
    metric_name: metric.name as WebVitalsMetricName,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    pathname,
    locale,
  });
};

export function WebVitalsReporter(): null {
  useReportWebVitals(handleWebVitals);
  return null;
}
