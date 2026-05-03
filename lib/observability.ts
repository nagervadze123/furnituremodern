// Observability facade in front of @sentry/nextjs.
//
// The public API — logError(error, ctx) and logEvent(name, payload) —
// is the stable contract that error boundaries and the slug action
// fallback path bind to. Callers must not import from @sentry/nextjs
// directly; route every error/event through this file so the privacy
// scrubbers (lib/observability/scrub.ts), DSN-unset no-op behaviour,
// and never-throw guarantee can't be bypassed.
//
// Privacy contract: ObservabilityContext is intentionally narrow.
// We never accept user identifiers, IP addresses, email addresses,
// session tokens, or cookie values here. Pass route, digest, scope,
// and arbitrary string tags — nothing else. The scrubbers configured
// at SDK init enforce the contract on the way out.
//
// The shim never throws. If observability itself fails — the SDK
// transport throws, the JSON serializer trips on a circular ref,
// anything — that failure is swallowed. Surfacing it would defeat
// the point of a fallback path that runs from inside an error
// boundary, where re-throwing produces an infinite render loop.
//
// In dev (NODE_ENV !== "production") with no DSN configured, we emit
// a single console.warn so a developer running `npm run dev` sees
// that the boundary fired. In production with no DSN we silently
// no-op — production deployments without a DSN are intentional
// (e.g. preview deploys), and console.warn would just be noise.
//
// When NEXT_PUBLIC_SENTRY_DSN is set we forward to Sentry. Errors go
// through Sentry.captureException (a structured payload Sentry can
// group, search, and assign); named events go through
// Sentry.captureMessage at level "info" (a separate stream from
// errors that doesn't trigger alerts).

import * as Sentry from "@sentry/nextjs";

export type ObservabilityContext = {
  route?: string;
  digest?: string;
  scope?: "global" | "route" | "boundary";
  tags?: Record<string, string>;
};

const PREFIX = "[observability]";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function hasDsn(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

// Best-effort serialization that survives circular references. We
// don't actually surface this output anywhere except dev-mode console
// output, but the function still has to refuse to throw — a serialize
// failure inside the error boundary would resurface as an even worse
// error.
function safeStringify(value: unknown): string {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, v) => {
      if (v && typeof v === "object") {
        if (seen.has(v as object)) return "[Circular]";
        seen.add(v as object);
      }
      if (v instanceof Error) {
        return { name: v.name, message: v.message };
      }
      return v;
    });
  } catch {
    return "[unserializable]";
  }
}

// Build the captureException options object from the narrow
// ObservabilityContext we accept. ctx.route/scope land in `tags`
// (Sentry indexes/filters on tags), digest goes in `extra` because
// it's a free-form reference id we don't want users to filter by.
// ctx.tags spreads in last so callers can override the structural
// tags when they have a reason to.
function buildCaptureContext(ctx: ObservabilityContext) {
  const tags: Record<string, string> = {};
  if (ctx.route) tags.route = ctx.route;
  if (ctx.scope) tags.scope = ctx.scope;
  if (ctx.tags) Object.assign(tags, ctx.tags);

  const extra: Record<string, unknown> = {};
  if (ctx.digest) extra.digest = ctx.digest;

  return { tags, extra };
}

export function logError(error: unknown, ctx: ObservabilityContext = {}): void {
  try {
    if (hasDsn()) {
      Sentry.captureException(error, buildCaptureContext(ctx));
      return;
    }

    if (!isProduction()) {
      // Dev affordance: surface SOMETHING so a developer running
      // `npm run dev` sees an error boundary fired. Production with
      // no DSN is silent on purpose.
      console.warn(
        `${PREFIX} logError`,
        safeStringify({ error, ctx })
      );
    }
  } catch {
    // Swallow. Observability must never escalate — a thrown SDK
    // transport call inside error.tsx would re-trigger the boundary.
  }
}

export function logEvent(
  name: string,
  payload: Record<string, unknown> = {}
): void {
  try {
    if (hasDsn()) {
      Sentry.captureMessage(name, { level: "info", extra: payload });
      return;
    }

    if (!isProduction()) {
      console.warn(
        `${PREFIX} logEvent`,
        safeStringify({ name, payload })
      );
    }
  } catch {
    // Swallow.
  }
}
