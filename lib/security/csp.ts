// Builds the Content-Security-Policy header string used by proxy.ts.
//
// Architectural lock-ins (do not weaken without explicit review):
//   • Production script-src is nonce-based with 'strict-dynamic'. NEVER
//     reintroduce 'unsafe-eval' or 'unsafe-inline' in production.
//   • Development script-src includes 'unsafe-eval' because React's dev
//     runtime evaluates strings at runtime to reconstruct server-side
//     error stacks; without it the dev console fills with CSP errors.
//   • style-src keeps 'unsafe-inline' even in production. Tailwind v4
//     emits a static stylesheet but Next.js framework code occasionally
//     injects small inline styles, and shadcn/base-ui primitives ship
//     style attributes. CHECKLIST.md tracks the Phase 4 hardening to
//     move style-src to nonce-based. Style injection is a much smaller
//     attack surface than script injection (no JS execution).
//   • frame-ancestors 'none' is mirrored by X-Frame-Options: DENY in
//     next.config.ts. Two headers, same answer — defense in depth.
//   • upgrade-insecure-requests forces any http:// subresource to
//     https://. Combined with HSTS this guarantees no mixed-content
//     downgrades survive a build.
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
};

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

  const styleSrc = "'self' 'unsafe-inline'";

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
  ];

  return directives.join("; ");
}
