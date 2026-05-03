// Sentry init for the edge runtime — middleware (proxy.ts) and any
// route handler that opts into runtime: "edge". Loaded by
// instrumentation.ts when process.env.NEXT_RUNTIME === "edge".
//
// The edge runtime is a thin V8 sandbox without Node APIs; the
// @sentry/vercel-edge transport (selected automatically by
// @sentry/nextjs) runs there instead of @sentry/node.
//
// Sample rate is lower than the server (5% vs 10%) because the proxy
// fires on every request, including static asset prefetches, and the
// transaction volume would dominate the project's Sentry quota.

import * as Sentry from "@sentry/nextjs";

import { scrubServerEvent } from "@/lib/observability/scrub";

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
  profilesSampleRate: 0,
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  beforeSend: scrubServerEvent,
});
