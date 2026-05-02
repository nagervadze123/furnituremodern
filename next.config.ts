// Project-wide Next.js configuration.
//
// Two responsibilities:
//   1. Wire next-intl so it knows where our request config lives.
//   2. Send strict security headers on every response, plus configure
//      next/image to allow our placeholder host (picsum.photos) and
//      our Supabase Storage origin.

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Browser-side Supabase calls (auth, REST, Realtime) all hit the project
// origin. Read it once and reuse it for the next/image whitelist.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : "";

// Static security headers sent on every response. The Content-Security-
// Policy is intentionally NOT here — it's set per-request from proxy.ts
// because it carries a nonce that has to be unique per page render.
const securityHeaders = [
  // HSTS: force HTTPS for two years, include subdomains, signal preload list eligibility.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing — stops a server-typed text/plain from being executed as JS.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No iframing this site, anywhere, ever (defense-in-depth alongside CSP frame-ancestors).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin (not the full URL) on cross-origin navigation.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features by default. interest-cohort=() opts out of FLoC.
  // geolocation=(self) is permissive enough for delivery-zone features inside our origin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // COOP isolates this top-level browsing context — required to be a cross-origin-isolated
  // page and protects against side-channel leaks via window.opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // CORP restricts which origins can embed our resources. Same-origin pairs well with COOP.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Apply the security headers to every route.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    // Whitelist of remote image hosts that next/image is allowed to load.
    // The Supabase host is added automatically when NEXT_PUBLIC_SUPABASE_URL
    // is configured, so uploaded product photos work without a manual edit.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
