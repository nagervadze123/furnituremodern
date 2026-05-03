// Pure helpers for /api/csp-report. Lifted into lib/ so they can be unit
// tested without spinning up a Next.js request — the route file itself
// stays a thin POST handler.
//
// Why two report shapes?
//   Browsers POST CSP violations in two formats depending on whether
//   they emitted via the legacy `report-uri` directive or the modern
//   `report-to` Reporting-API directive:
//
//   • Legacy (`report-uri`, `Content-Type: application/csp-report`):
//       { "csp-report": { ... } }
//
//   • Modern (`report-to`, `Content-Type: application/reports+json`):
//       [ { "type": "csp-violation", "body": { ... } }, ... ]
//
//   Both wrap the same field set, just under different keys. We accept
//   either and normalize to a single internal shape before insert.
//
// Privacy contract:
//   • document_uri is path-only — the route handler strips query string
//     and fragment before calling buildViolationRow() to avoid leaking
//     session-bearing URLs into the table.
//   • IP is never stored raw; the caller hashes it before insert.
//   • script_sample (some browsers attach a tiny excerpt of the
//     violating inline content) is stored verbatim — it can contain
//     parts of the page's source. Truncated at MAX_SAMPLE_LENGTH so a
//     deliberately huge payload can't flood the table.

import { z } from "zod";

// Match the shape used by /api/log-404 and /api/vitals so the rate
// limiter behaviour stays consistent across routes.
export type RateLimiter = (ip: string) => boolean;

export function createRateLimiter({
  max,
  windowMs,
  now = Date.now,
}: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  return (ip: string) => {
    const t = now();
    const entry = buckets.get(ip);
    if (!entry || t - entry.windowStart > windowMs) {
      buckets.set(ip, { count: 1, windowStart: t });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count += 1;
    return true;
  };
}

// Field caps. CSP report bodies are usually small (<2KB) but a hostile
// client could submit a multi-megabyte original-policy string; we
// truncate everything that's free-form text.
const MAX_URI_LENGTH = 2048;
const MAX_DIRECTIVE_LENGTH = 256;
const MAX_POLICY_LENGTH = 8192;
const MAX_SAMPLE_LENGTH = 1024;

// Legacy `report-uri` body. The browser wraps the report in
// `csp-report`. Field names use kebab-case in the wire format.
const cspReportBodySchema = z
  .object({
    "document-uri": z.string().max(MAX_URI_LENGTH).optional(),
    referrer: z.string().max(MAX_URI_LENGTH).optional(),
    "violated-directive": z.string().max(MAX_DIRECTIVE_LENGTH).optional(),
    "effective-directive": z.string().max(MAX_DIRECTIVE_LENGTH).optional(),
    "original-policy": z.string().max(MAX_POLICY_LENGTH).optional(),
    "blocked-uri": z.string().max(MAX_URI_LENGTH).optional(),
    disposition: z.enum(["enforce", "report"]).optional(),
    "source-file": z.string().max(MAX_URI_LENGTH).optional(),
    "line-number": z.number().int().nonnegative().optional(),
    "column-number": z.number().int().nonnegative().optional(),
    "script-sample": z.string().max(MAX_SAMPLE_LENGTH).optional(),
    "status-code": z.number().int().nonnegative().optional(),
  })
  .passthrough();

const legacyReportSchema = z.object({
  "csp-report": cspReportBodySchema,
});

// Modern Reporting-API body. The browser POSTs an ARRAY of reports.
// Each report has `type: "csp-violation"` and a `body` object whose
// keys use camelCase (not kebab-case like the legacy shape).
const modernReportBodySchema = z
  .object({
    documentURL: z.string().max(MAX_URI_LENGTH).optional(),
    referrer: z.string().max(MAX_URI_LENGTH).optional(),
    blockedURL: z.string().max(MAX_URI_LENGTH).optional(),
    effectiveDirective: z.string().max(MAX_DIRECTIVE_LENGTH).optional(),
    originalPolicy: z.string().max(MAX_POLICY_LENGTH).optional(),
    sourceFile: z.string().max(MAX_URI_LENGTH).optional(),
    sample: z.string().max(MAX_SAMPLE_LENGTH).optional(),
    disposition: z.enum(["enforce", "report"]).optional(),
    statusCode: z.number().int().nonnegative().optional(),
    lineNumber: z.number().int().nonnegative().optional(),
    columnNumber: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const modernReportSchema = z
  .array(
    z
      .object({
        type: z.string().optional(),
        url: z.string().max(MAX_URI_LENGTH).optional(),
        body: modernReportBodySchema.optional(),
      })
      .passthrough()
  )
  .nonempty();

// Normalized internal shape we pass to Sentry + Supabase. Both wire
// shapes are projected into this single object so callers don't have
// to branch on which header fired the report.
export type NormalizedCspReport = {
  disposition: "enforce" | "report";
  documentUri: string;
  referrer: string | null;
  violatedDirective: string;
  effectiveDirective: string | null;
  originalPolicy: string | null;
  blockedUri: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  scriptSample: string | null;
  statusCode: number | null;
};

// Strip query string and fragment from a URL or path. Tolerant of
// inputs that aren't valid URLs (e.g. `about:srcdoc`) — falls back
// to the substring before the first '?' or '#'.
export function stripQueryAndFragment(input: string): string {
  const cut = input.split(/[?#]/, 1)[0];
  return cut ?? input;
}

// Returns true when the blocked URI looks like browser-extension noise.
// These reports are extensions running in the user's browser modifying
// the page (Grammarly, password managers, ad-blockers, etc.) — not a
// real CSP attack on our site. Filtering them keeps the signal clean.
//
// Schemes we treat as noise are spelled out so we don't accidentally
// drop something interesting. The trailing colon is part of the
// standard URI scheme syntax; checking with `startsWith` plus the
// colon avoids matching values that merely contain the substring.
const EXTENSION_SCHEMES = [
  "chrome-extension:",
  "moz-extension:",
  "safari-extension:",
  "safari-web-extension:",
  "ms-browser-extension:",
];

export function isBrowserExtensionReport(blockedUri: string | null): boolean {
  if (!blockedUri) return false;
  const lower = blockedUri.toLowerCase();
  return EXTENSION_SCHEMES.some((scheme) => lower.startsWith(scheme));
}

// Parse an unknown JSON body into a NormalizedCspReport, or null when
// the body matches neither shape. We try the modern shape first
// because Chrome (the most common reporter source) uses it; falling
// back to the legacy shape covers Firefox and Safari.
export function parseCspReport(raw: unknown): NormalizedCspReport | null {
  // Modern Reporting-API: array of reports. We pick the first
  // `csp-violation` entry — browsers may batch other types into the
  // same POST, but we're only interested in CSP here.
  if (Array.isArray(raw)) {
    const parsedArr = modernReportSchema.safeParse(raw);
    if (!parsedArr.success) return null;
    const cspEntry = parsedArr.data.find(
      (r) => r.type === "csp-violation" && r.body
    );
    if (!cspEntry?.body) return null;
    const body = cspEntry.body;
    const documentUri = body.documentURL ?? cspEntry.url ?? "";
    const directive =
      body.effectiveDirective ?? "";
    if (!documentUri || !directive) return null;
    return {
      disposition: body.disposition ?? "report",
      documentUri: stripQueryAndFragment(documentUri),
      referrer: body.referrer ? stripQueryAndFragment(body.referrer) : null,
      violatedDirective: directive,
      effectiveDirective: body.effectiveDirective ?? null,
      originalPolicy: body.originalPolicy ?? null,
      blockedUri: body.blockedURL ?? null,
      sourceFile: body.sourceFile ? stripQueryAndFragment(body.sourceFile) : null,
      lineNumber: body.lineNumber ?? null,
      columnNumber: body.columnNumber ?? null,
      scriptSample: body.sample ?? null,
      statusCode: body.statusCode ?? null,
    };
  }

  // Legacy `report-uri` body.
  const parsed = legacyReportSchema.safeParse(raw);
  if (!parsed.success) return null;
  const body = parsed.data["csp-report"];
  const documentUri = body["document-uri"] ?? "";
  const directive =
    body["violated-directive"] ?? body["effective-directive"] ?? "";
  if (!documentUri || !directive) return null;
  return {
    disposition: body.disposition ?? "report",
    documentUri: stripQueryAndFragment(documentUri),
    referrer: body.referrer ? stripQueryAndFragment(body.referrer) : null,
    violatedDirective: directive,
    effectiveDirective: body["effective-directive"] ?? null,
    originalPolicy: body["original-policy"] ?? null,
    blockedUri: body["blocked-uri"] ?? null,
    sourceFile: body["source-file"]
      ? stripQueryAndFragment(body["source-file"])
      : null,
    lineNumber: body["line-number"] ?? null,
    columnNumber: body["column-number"] ?? null,
    scriptSample: body["script-sample"] ?? null,
    statusCode: body["status-code"] ?? null,
  };
}
