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
// origin. Read it once and feed it into both the CSP and the image
// whitelist so the two stay in sync without manual edits.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : "";
const supabaseOriginForCsp = SUPABASE_URL
  ? new URL(SUPABASE_URL).origin
  : "";

// Content-Security-Policy
// 'self'                 = our own origin only
// 'unsafe-inline'        = inline <script>/<style>; Next.js needs this for
//                          its hydration scripts and Tailwind-generated
//                          inline styles. Tighten with nonces later.
// img-src https:         = allow placeholder images from any HTTPS host
// frame-ancestors 'none' = nobody can iframe us (anti-clickjacking)
// connect-src includes the Supabase project origin (and its wss:// peer)
//                        so the browser client can hit auth, REST, and
//                        Realtime websockets without being blocked.
const connectSrc = ["'self'"];
if (supabaseOriginForCsp) {
  connectSrc.push(supabaseOriginForCsp);
  // Realtime uses websockets on the same host.
  connectSrc.push(supabaseOriginForCsp.replace(/^https:/, "wss:"));
}

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // HSTS: tell browsers to always use HTTPS for the next 2 years.
  // Only takes effect once the site is served over HTTPS in production.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No iframing this site, anywhere, ever.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin (not the full URL) on cross-origin navigation.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: csp },
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
