// Project-wide Next.js configuration.
//
// Responsibilities:
//   1. Wire next-intl so it knows where our request config lives.
//   2. Send strict security headers on every response, plus configure
//      next/image to allow our placeholder host (picsum.photos) and
//      our Supabase Storage origin.
//   3. Enable image AVIF/WebP delivery + a long edge cache.
//   4. Wire @next/bundle-analyzer behind ANALYZE=true.
//   5. Opt into Next 16's experimental viewTransition flag so route
//      navigations animate via the browser's View Transitions API
//      where supported (graceful no-op elsewhere; respects
//      prefers-reduced-motion natively).

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { buildImagesConfig } from "./lib/perf/image-config";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
  // Apply the security headers to every route, plus per-route caching
  // overrides for generated assets that benefit from long-tail SWR.
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // OG images regenerate cheaply; cache them for an hour at the
      // edge with a day of stale-while-revalidate so social unfurlers
      // never wait on cold renders. Two sources because path-to-regexp
      // can't match the top-level /opengraph-image and the nested
      // /[locale]/[category]/[slug]/opengraph-image with a single
      // pattern (named segments are greedy and need a leading slash).
      {
        source: "/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path+/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // sitemap.xml is served by Next's MetadataRoute.Sitemap, which
      // doesn't expose a Response object — its `revalidate = 3600`
      // declaration controls ISR, not the response headers crawlers
      // see. Override here so search engines and unfurlers cache the
      // last good copy for an hour with a day of SWR fallback.
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // Service worker — must be revalidated on every load so a new
      // build's SW reaches every client without waiting on a stale
      // cached copy. Setting the JS content-type explicitly stops
      // browsers from refusing to register an oddly-typed worker.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },

  // Centralized in lib/perf/image-config.ts so the same shape is
  // tested in vitest. AVIF/WebP delivery, 1y minimumCacheTTL,
  // calibrated deviceSizes/imageSizes, and a locked remotePatterns
  // list (picsum + Supabase only when configured).
  images: buildImagesConfig(process.env.NEXT_PUBLIC_SUPABASE_URL),

  experimental: {
    // Lets Next trigger React's <ViewTransition> integration during
    // navigations. Browsers without View Transitions API support fall
    // back silently; prefers-reduced-motion is respected by the
    // browser engine without extra wiring.
    viewTransition: true,
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default analyzer(withNextIntl(nextConfig));
