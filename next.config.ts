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
//   6. Wrap the final config in withSentryConfig so the @sentry/nextjs
//      build plugin can instrument server functions and (when the
//      SENTRY_AUTH_TOKEN is present at build time) upload source maps
//      to Sentry. The wrapper is the OUTERMOST one — it must see the
//      finalised next-intl + bundle-analyzer config so it can wrap
//      their webpack/turbopack hooks.

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
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
  // COEP locks the document into a cross-origin-isolated context so
  // future SharedArrayBuffer / performance.now() high-precision
  // pathways are unlocked. `credentialless` is the relaxed variant of
  // `require-corp` — it lets us embed cross-origin <img>/<script> that
  // do NOT carry a CORP header, as long as the request is sent without
  // credentials (cookies, client certs). This matters for Phase 6 when
  // ad / pixel hosts that don't ship CORP headers need to render
  // without breaking isolation. The strict `require-corp` variant
  // would block every such resource. Browser support: Chrome 110+,
  // Edge 110+, Firefox 110+. Safari currently ignores the header (no
  // isolation gained, no breakage either).
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
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

const composedConfig = analyzer(withNextIntl(nextConfig));

// withSentryConfig is the outermost wrapper. Its second arg is the
// Sentry build-plugin config (org/project/auth-token + telemetry
// flags); options like silent/widenClientFileUpload belong here,
// NOT in Sentry.init().
//
// Source maps:
//   • Always generated (webpack default) so client stacks can be
//     symbolicated locally.
//   • Uploaded to Sentry only when SENTRY_AUTH_TOKEN is set. The
//     Vercel Sentry integration writes that var on production
//     deploys; preview deploys leave it unset, so we don't burn the
//     project's release quota on every PR push.
//   • sourcemaps.filesToDeleteAfterUpload removes the .map files
//     from the .next output once they've been uploaded to Sentry,
//     so end users can't fetch the original source from the browser
//     even if Sentry has them. (This replaces the v9-and-earlier
//     `hideSourceMaps` flag.)
//
// webpack.treeshake.removeDebugLogging strips Sentry SDK debug log
// statements from the production browser bundle — useful in dev,
// pure noise in shipped code. (v10 rename of `disableLogger`.)
//
// webpack.automaticVercelMonitors stays false because our cron jobs
// (e.g. any future scheduled revalidation) don't have explicit
// names yet and we don't want Sentry inventing monitor IDs we have
// to reconcile later. (v10 rename of `automaticVercelMonitors`.)
export default withSentryConfig(composedConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: Boolean(process.env.CI),
  widenClientFileUpload: true,
  sourcemaps: {
    filesToDeleteAfterUpload: ["**/*.js.map", "**/*.mjs.map"],
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
  // Skip the telemetry beacon Sentry sends to itself on each build.
  telemetry: false,
});
