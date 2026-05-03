// Next.js 13+ instrumentation hook. Required by @sentry/nextjs v8+
// to bootstrap the server and edge SDK runtimes — without this file,
// sentry.server.config.ts and sentry.edge.config.ts are never
// imported and no events leave the runtime.
//
// The dynamic imports are gated by NEXT_RUNTIME so the Node SDK
// doesn't load in the edge sandbox (and vice versa). Each config
// file calls Sentry.init() as a side effect at module load.
//
// onRequestError is Sentry's hook for App Router server-side errors
// thrown inside Server Components, route handlers, and proxies.
// Exporting it here lets the framework forward those errors into
// Sentry's transport without callers needing to wire anything up.

import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
