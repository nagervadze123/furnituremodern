// Builds the Content-Security-Policy header string used by proxy.ts.
//
// Architectural lock-ins (do not weaken without explicit review):
//   • Production script-src is nonce-based with 'strict-dynamic'. NEVER
//     reintroduce 'unsafe-eval' or 'unsafe-inline' in production.
//   • Development script-src includes 'unsafe-eval' because React's dev
//     runtime evaluates strings at runtime to reconstruct server-side
//     error stacks; without it the dev console fills with CSP errors.
//   • Production style-src keeps 'unsafe-inline' as a known trade-off.
//     base-ui's anchor positioning (DropdownMenu, NavigationMenu) sets
//     style attributes via floating-ui; CSP nonces apply to <style>
//     elements only, not style="" attributes — so a strict
//     `style-src 'self' 'nonce-X'` would break those primitives. Style
//     injection is a much smaller attack surface than script injection
//     (no JS execution). Phase 4 Task 3 instead ships a parallel
//     Content-Security-Policy-Report-Only header (built via
//     mode: "report-only") that DOES enforce the strict style-src.
//     Report-Only doesn't block — the browser only fires a violation
//     report — so production is unaffected. After ~1 week of telemetry
//     in /api/csp-report, a follow-up task can pick the right
//     enforcement shape (e.g. style-src-elem strict + style-src-attr
//     'unsafe-inline', or 'unsafe-hashes' with a hash list, or full
//     strict if base-ui adds nonce-attr support).
//   • frame-ancestors 'none' is mirrored by X-Frame-Options: DENY in
//     next.config.ts. Two headers, same answer — defense in depth.
//   • upgrade-insecure-requests forces any http:// subresource to
//     https://. Combined with HSTS this guarantees no mixed-content
//     downgrades survive a build.
//   • report-uri /api/csp-report + report-to csp-endpoint feed
//     /api/csp-report. The Reporting-Endpoints HTTP header (set in
//     proxy.ts) declares the csp-endpoint name. report-uri is the
//     legacy directive that wider browser sets honor; report-to is the
//     modern Reporting API replacement. Both are emitted for coverage.
//
// connect-src is computed from the configured Supabase origin so the
// browser client can hit auth/REST/Realtime; we add the wss:// peer for
// Realtime websockets.
//
// When optional analytics providers are configured we extend script-src,
// script-src-elem, connect-src, and img-src with their published
// domains. Domains stay out of the policy when the corresponding env
// var is unset, so a single-deployment site with no analytics keeps the
// strict baseline. Linking domain inclusion to provider activation
// (rather than env-var presence alone) is intentional — when GTM is set
// it owns GA4 / Meta inside its container, so the direct loaders skip
// and their hosts stay out of CSP. If a deployment's GTM container is
// configured to fan out to providers whose env var is unset, those
// fan-outs will be blocked by CSP — set the matching public env var to
// allow them.

import type { AnalyticsConfig } from "@/lib/analytics/config";

type BuildCspArgs = {
  nonce: string;
  isDev: boolean;
  supabaseOrigin: string; // empty string when Supabase isn't configured
  analytics?: AnalyticsConfig;
  // Origin of the configured Sentry ingest endpoint, parsed once at
  // cold start from NEXT_PUBLIC_SENTRY_DSN. Empty when Sentry is not
  // configured. Verified note: the @sentry/nextjs browser SDK is
  // bundled into the page and loaded via Next.js's nonce-stamped
  // <script> tags — it does NOT inject inline <script> elements, so
  // the existing nonce/strict-dynamic script-src works unchanged. The
  // only adjustment Sentry needs is connect-src access to the ingest
  // origin so submitted events aren't blocked. If a future Sentry
  // major version starts injecting inline scripts, halt the upgrade
  // and document the workaround here rather than relaxing script-src.
  sentryIngestOrigin?: string;
  // "enforce" (default) emits the production-strict CSP that keeps
  // 'unsafe-inline' on style-src for base-ui compatibility.
  // "report-only" emits the same CSP but with a strict
  // `style-src 'self' 'nonce-X'` (no 'unsafe-inline'); proxy.ts ships
  // this string under the Content-Security-Policy-Report-Only header so
  // browsers report violations without blocking. See file header for
  // the rollout plan.
  mode?: "enforce" | "report-only";
};

// Path the browser POSTs CSP violation reports to. Imported by proxy.ts
// when it sets the Reporting-Endpoints header so the two stay in sync.
export const CSP_REPORT_PATH = "/api/csp-report";

// Named endpoint declared in the Reporting-Endpoints HTTP header
// (proxy.ts) and referenced by the report-to CSP directive. Browsers
// use this name to look up the destination URL from
// Reporting-Endpoints.
export const CSP_REPORT_TO_NAME = "csp-endpoint";

// Domains required by each provider's loader + beacon endpoints.
// Sourced from each vendor's published CSP guidance.
const PROVIDER_DOMAINS = {
  google: {
    // gtm.js + gtag/js + GA4 collect endpoint
    script: ["https://www.googletagmanager.com"],
    connect: [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.google-analytics.com",
      "https://*.g.doubleclick.net",
    ],
    img: [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://*.g.doubleclick.net",
    ],
  },
  meta: {
    script: ["https://connect.facebook.net"],
    connect: ["https://www.facebook.com", "https://connect.facebook.net"],
    img: ["https://www.facebook.com", "https://*.facebook.com"],
  },
  plausible: {
    script: ["https://plausible.io"],
    connect: ["https://plausible.io"],
    img: [] as string[],
  },
} as const;

export function buildCsp({
  nonce,
  isDev,
  supabaseOrigin,
  analytics,
  sentryIngestOrigin,
  mode = "enforce",
}: BuildCspArgs): string {
  const connectSrc = ["'self'"];
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin.replace(/^https:/, "wss:"));
  }
  if (sentryIngestOrigin) {
    connectSrc.push(sentryIngestOrigin);
  }

  const extraScript: string[] = [];
  const extraImg: string[] = [];

  if (analytics) {
    // Google domains cover BOTH GTM mode and direct GA4 mode (gtm.js
    // and gtag/js share the same host).
    if (analytics.enabled.gtm || analytics.enabled.ga4) {
      extraScript.push(...PROVIDER_DOMAINS.google.script);
      connectSrc.push(...PROVIDER_DOMAINS.google.connect);
      extraImg.push(...PROVIDER_DOMAINS.google.img);
    }
    if (analytics.enabled.meta) {
      extraScript.push(...PROVIDER_DOMAINS.meta.script);
      connectSrc.push(...PROVIDER_DOMAINS.meta.connect);
      extraImg.push(...PROVIDER_DOMAINS.meta.img);
    }
    if (analytics.enabled.plausible) {
      extraScript.push(...PROVIDER_DOMAINS.plausible.script);
      connectSrc.push(...PROVIDER_DOMAINS.plausible.connect);
    }
  }

  // 'strict-dynamic' lets framework-loaded scripts load their own
  // dependencies without requiring every CDN host to be allow-listed.
  // The explicit provider hosts are appended for browsers that ignore
  // strict-dynamic (older Safari) and for inline-loaded subresources
  // that don't inherit the script's trust.
  const scriptHosts = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptHosts.push("'unsafe-eval'");
  scriptHosts.push(...extraScript);
  const scriptSrc = scriptHosts.join(" ");

  // script-src-elem governs <script> element loads specifically. Without
  // it the directive falls back to script-src, which is fine — but
  // setting it explicitly makes the contract visible and survives any
  // future split where script (eval-ish) and script-src-elem (real
  // <script> tags) diverge.
  const scriptSrcElem = scriptSrc;

  // Enforce mode keeps 'unsafe-inline' for base-ui style attributes
  // (see file header). Report-only mode tightens to nonce-only so the
  // parallel header surfaces violations without blocking.
  const styleSrc =
    mode === "report-only"
      ? `'self' 'nonce-${nonce}'`
      : "'self' 'unsafe-inline'";

  // img-src deliberately keeps the broad `https:` to cover product
  // photography hosted on a CDN we haven't named yet (see
  // CHECKLIST.md "Replace product photos"). The Supabase Storage host
  // is listed explicitly when configured so the contract is readable
  // even after `https:` is eventually narrowed.
  const imgHosts = ["'self'", "data:", "blob:", "https:"];
  if (supabaseOrigin) imgHosts.push(supabaseOrigin);
  imgHosts.push(...extraImg);
  const imgSrc = imgHosts.join(" ");

  // next/font self-hosts most type, but ImageResponse OG templates fetch
  // Google Fonts at render time on the server (not in the browser) — the
  // explicit fonts.gstatic.com entry is here for resilience if any
  // browser-side font ever ends up on that host.
  const fontSrc = "'self' data: https://fonts.gstatic.com";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrcElem}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src ${fontSrc}`,
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    // Both reporting directives are emitted. report-uri is the legacy
    // Level-2 directive that Firefox/Safari honor; report-to is the
    // modern Reporting-API directive that Chrome/Edge prefer (and
    // ignore the legacy one when it's present). Browsers that don't
    // recognize report-to silently fall back to report-uri.
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_TO_NAME}`,
  ];

  return directives.join("; ");
}
