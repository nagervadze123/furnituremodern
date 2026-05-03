// Sentry init for the browser. Loaded by Next.js when this file
// exists at the project root (no explicit import required); the
// withSentryConfig wrapper in next.config.ts wires the bundling.
//
// CSP / nonce posture: the @sentry/nextjs browser SDK is bundled
// into the page's JS by Next.js webpack/turbopack and loaded via
// the framework's nonce-stamped <script> tags. It does NOT inject
// inline <script> elements, so the existing nonce-based CSP in
// lib/security/csp.ts works unchanged. The only CSP adjustment is
// the connect-src extension to allow event submission to the
// configured Sentry ingest origin — handled in lib/security/csp.ts
// alongside the analytics provider extensions.
//
// Replay (Session Replay product) is intentionally NOT enabled.
// It captures user input streams and DOM mutations, which would
// require an explicit consent flow we haven't built. CHECKLIST.md
// tracks the Phase 6+ revisit.
//
// Privacy: scrubClientEvent strips URL query strings, cookies,
// IP-bearing headers, the User-Agent, and Authorization-style
// headers before transmission. See lib/observability/scrub.test.ts
// for the contract.

import * as Sentry from "@sentry/nextjs";

import { scrubClientEvent } from "@/lib/observability/scrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const RELEASE = process.env.VERCEL_GIT_COMMIT_SHA;

const TRACES_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : ENV === "production"
    ? 0.05
    : 1.0;

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  environment: ENV,
  release: RELEASE,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  // Default integrations only — no third-party Sentry plugins, no
  // browserProfilingIntegration (Phase 5+), no Replay.
  integrations: [],
  // Defence in depth: the SDK already respects sendDefaultPii: false
  // (the default), but defaultPii=false doesn't strip query strings
  // or fingerprinting headers. The scrubber does both.
  sendDefaultPii: false,
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  beforeSend: scrubClientEvent,
});

// Sentry recommends exporting onRouterTransitionStart from the
// browser config so the SDK can stitch client-side route
// transitions into transactions. It's a no-op when the SDK is
// disabled (DSN unset).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
