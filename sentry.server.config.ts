// Sentry init for the Node runtime — server components, route
// handlers, server actions. Loaded by instrumentation.ts when
// process.env.NEXT_RUNTIME === "nodejs".
//
// Init is gated on NEXT_PUBLIC_SENTRY_DSN: with the var unset,
// Sentry.init() is still called but with `enabled: false`, which
// turns the SDK into a no-op transport (no network requests, no
// scopes attached, no integrations spun up).
//
// Privacy: every outgoing event flows through scrubServerEvent in
// lib/observability/scrub.ts, which strips IP addresses, cookies,
// User-Agent, and forwarded-IP headers before transmission. Tests
// for the scrubber live in lib/observability/scrub.test.ts.

import * as Sentry from "@sentry/nextjs";

import { scrubServerEvent } from "@/lib/observability/scrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const RELEASE = process.env.VERCEL_GIT_COMMIT_SHA;

// Sample rate: env override wins, then sensible defaults per env.
// Production is downsampled to 10% to keep transaction volume sane;
// dev runs at 100% so the developer sees every transaction in the
// Sentry UI while iterating.
const TRACES_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : ENV === "production"
    ? 0.1
    : 1.0;

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  environment: ENV,
  release: RELEASE,
  tracesSampleRate: TRACES_SAMPLE_RATE,
  // Profiling stays off — privacy review hasn't covered the call-stack
  // capture surface, and Phase 4 scope is errors-only.
  profilesSampleRate: 0,
  // NEXT_NOT_FOUND and NEXT_REDIRECT are control-flow signals Next.js
  // throws to short-circuit rendering. They reach the error.tsx
  // boundary in the SDK's instrumentation but are NOT real errors;
  // ignoring them keeps the Sentry inbox readable.
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  beforeSend: scrubServerEvent,
});
