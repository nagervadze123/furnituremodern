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
//
// Each header below is load-bearing. Do not silently weaken any value.
// Pre-launch checklist in CHECKLIST.md tracks the items that have to flip
// at a specific phase (e.g. Permissions-Policy `payment=(self)` when
// payment forms ship in Phase 6).
const securityHeaders = [
  // HSTS: 2 years, every subdomain, eligible for the browser preload list.
  // 63072000 seconds = 2 years — required minimum for hstspreload.org.
  // Do NOT lower max-age and do NOT remove `preload` once submitted; both
  // are one-way commitments the browser caches for the full duration.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing — stops a server-typed text/plain from being
  // executed as JS or other active content.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No iframing this site, anywhere, ever. Defense-in-depth alongside the
  // CSP `frame-ancestors 'none'` directive set in lib/security/csp.ts.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin (not the full URL) on cross-origin same-protocol
  // navigations. Full URL on same-origin, nothing on HTTPS→HTTP downgrades.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features by default. Each disabled feature is
  // either irrelevant to this catalogue site or a known fingerprinting/
  // tracking surface.
  //
  //   camera/microphone        — never used; would expose a media-capture surface.
  //   geolocation=(self)       — reserved for a future "find nearest store" UX.
  //   interest-cohort=()       — opts out of legacy FLoC/Topics ad targeting.
  //   payment=()               — must flip to (self) in Phase 6 when payment forms ship.
  //   usb / magnetometer /
  //   gyroscope / accelerometer — block hardware-sensor APIs the catalogue
  //                               will never need; they're common
  //                               fingerprinting and side-channel vectors.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  // COOP isolates this top-level browsing context — required to land in a
  // cross-origin-isolated context and prevents side-channel leaks via
  // window.opener. Pair with CORP below for full isolation.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // CORP stops other origins from embedding our responses (<img>, <script>,
  // etc.). Combined with COOP this sets up the cross-origin-isolated
  // posture future SharedArrayBuffer / high-precision timer needs require.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Allow the browser to start DNS resolution speculatively for off-page
  // links. Safe with CSP in place (the actual fetches still get filtered).
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Opt the origin into per-origin agent clustering so this site sits in
  // its own memory partition. Standard production hardening; the `?1`
  // value is the structured-header boolean for "true".
  { key: "Origin-Agent-Cluster", value: "?1" },
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
      // Same long-tail cache policy for Twitter / X cards. Matches the
      // top-level /twitter-image route, every nested /[locale]/.../twitter-image,
      // and the manually-routed /twitter-image-square variants.
      {
        source: "/twitter-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path+/twitter-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/twitter-image-square",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path+/twitter-image-square",
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
