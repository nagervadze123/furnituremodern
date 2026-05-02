// Builds the Content-Security-Policy header string used by proxy.ts.
//
// Two modes: development (includes 'unsafe-eval' on script-src because
// React's dev runtime evaluates strings at runtime to reconstruct
// server-side error stacks; without this, the dev console fills with CSP
// errors about the eval directive being violated) and production
// (nonce-based strict-dynamic — no 'unsafe-eval', no 'unsafe-inline' on
// script-src).
//
// connect-src is computed from the configured Supabase origin so the
// browser client can hit auth/REST/Realtime; we add the wss:// peer for
// Realtime websockets.
//
// When optional analytics providers are configured we extend script-src,
// connect-src, and (for Meta only) img-src with their published domains.
// Domains stay out of the policy when the corresponding env var is
// unset, so a single-deployment site with no analytics keeps the
// strict baseline.

import type { AnalyticsConfig } from "@/lib/analytics/config";

type BuildCspArgs = {
  nonce: string;
  isDev: boolean;
  supabaseOrigin: string; // empty string when Supabase isn't configured
  analytics?: AnalyticsConfig;
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
}: BuildCspArgs): string {
  const connectSrc = ["'self'"];
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin.replace(/^https:/, "wss:"));
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

  // Style-src stays 'unsafe-inline' even in production: Tailwind v4 emits
  // a static stylesheet but Next.js framework code occasionally injects
  // small inline styles that aren't worth the breakage risk to nonce.
  const styleSrc = "'self' 'unsafe-inline'";

  const imgSrc = ["'self'", "data:", "blob:", "https:", ...extraImg].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
