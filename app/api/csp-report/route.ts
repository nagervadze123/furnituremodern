// Receives Content-Security-Policy violation reports.
//
// Two write paths, both fire on a valid report:
//   1. lib/observability.logEvent("csp_violation", report) — forwards
//      to Sentry when NEXT_PUBLIC_SENTRY_DSN is configured. Surfaces
//      the violation in the same stream as other observability events.
//   2. csp_violations Supabase table — persistent storage for the
//      admin dashboard. Sentry retention is short (~30 days on free
//      tier); this row gives us a longer window to review trends.
//
// Browsers POST in two formats:
//   • Legacy `report-uri`: Content-Type: application/csp-report,
//                          body: { "csp-report": { ... } }
//   • Modern Reporting-API: Content-Type: application/reports+json,
//                           body: [ { "type": "csp-violation", "body": { ... } } ]
// Both shapes are parsed by lib/api/csp-report.parseCspReport().
//
// Rate limit: 100 reports / minute / IP. CSP violations can flood
// quickly under attack — a hostile page could iframe ours and trigger
// a violation on every paint. The cap is intentionally generous so a
// real misconfigured page that fires a few violations per render
// doesn't get throttled, but a runaway loop or DoS attempt does.
//
// Filtered noise:
//   • chrome-extension:// / moz-extension:// blocked-uri values are
//     dropped silently. These reports come from extensions modifying
//     the page in the user's browser, not from our site. Filtering
//     them keeps the dashboard signal clean.
//
// Always returns 204 No Content (or 400/429 for invalid/rate-limited
// requests). Browsers treat any 2xx as success and discard the
// report; returning a body would just waste bytes.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createRateLimiter,
  isBrowserExtensionReport,
  parseCspReport,
} from "@/lib/api/csp-report";
import { logEvent } from "@/lib/observability";

// Same FNV-1a 32-bit hash used by /api/log-404 — ip_hash columns
// across the project share the same key space so admins can correlate
// rows from different sources for a single visitor without storing
// raw IPs anywhere.
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

const withinRateLimit = createRateLimiter({ max: 100, windowMs: 60_000 });

export async function POST(request: Request) {
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const bucketKey = rawIp ?? "unknown";

  if (!withinRateLimit(bucketKey)) {
    // Browsers ignore the body but DO honor the status code for
    // backoff in some implementations; 429 is the right signal.
    return NextResponse.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 }
    );
  }

  const report = parseCspReport(raw);
  if (!report) {
    return NextResponse.json(
      { ok: false, error: "invalid payload" },
      { status: 400 }
    );
  }

  // Drop browser-extension noise BEFORE forwarding to Sentry. Sentry
  // counts against quota; we don't want hundreds of "Grammarly
  // blocked an inline style" events using up the budget.
  if (isBrowserExtensionReport(report.blockedUri)) {
    return new Response(null, { status: 204 });
  }

  // Forward to Sentry first. logEvent never throws — even if the
  // SDK transport fails the function swallows it — so the Supabase
  // insert below always runs.
  logEvent("csp_violation", {
    disposition: report.disposition,
    documentUri: report.documentUri,
    violatedDirective: report.violatedDirective,
    effectiveDirective: report.effectiveDirective,
    blockedUri: report.blockedUri,
    sourceFile: report.sourceFile,
    lineNumber: report.lineNumber,
  });

  // Supabase insert is best-effort. If Supabase isn't configured (e.g.
  // a preview deploy without the env vars wired) we skip the write
  // rather than 500'ing — the Sentry forward already has the data.
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      await supabase.from("csp_violations").insert({
        disposition: report.disposition,
        document_uri: report.documentUri,
        referrer: report.referrer,
        violated_directive: report.violatedDirective,
        effective_directive: report.effectiveDirective,
        original_policy: report.originalPolicy,
        blocked_uri: report.blockedUri,
        source_file: report.sourceFile,
        line_number: report.lineNumber,
        column_number: report.columnNumber,
        script_sample: report.scriptSample,
        status_code: report.statusCode,
        ip_hash: hashIp(rawIp),
      });
    } catch {
      // Swallow. CSP reporting is observability — never let an
      // ingestion failure surface as a non-2xx to the browser.
    }
  }

  return new Response(null, { status: 204 });
}
