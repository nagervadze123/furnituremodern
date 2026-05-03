// Observability shim. Swap-target for @sentry/nextjs in Phase 4.
//
// The public API — logError(error, ctx) and logEvent(name, payload) —
// is the contract Phase 4 must keep. When Sentry is installed, the
// no-op bodies below get replaced with calls into the real SDK; no
// caller has to change.
//
// Privacy contract: ObservabilityContext is intentionally narrow.
// We never accept user identifiers, IP addresses, email addresses,
// session tokens, or cookie values here. Pass route, digest, scope,
// and arbitrary string tags — nothing else. Phase 4 must preserve
// this constraint when wiring Sentry's beforeSend hook.
//
// The shim never throws. If observability itself fails, that failure
// is swallowed — surfacing it would defeat the point of a fallback
// path that runs from inside an error boundary.
//
// In dev (NODE_ENV !== "production") with no DSN configured, we emit
// a single console.warn so a developer working locally sees that the
// boundary fired. In production with no DSN we silently no-op.
//
// When NEXT_PUBLIC_SENTRY_DSN is set today: still no-op (Sentry isn't
// installed yet) but the dev-warn is suppressed so a half-configured
// staging environment doesn't fill the browser console with noise.

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

export function logError(error: unknown, ctx: ObservabilityContext = {}): void {
  try {
    if (hasDsn()) {
      // TODO(Phase 4): call into @sentry/nextjs here.
      //
      //   import * as Sentry from "@sentry/nextjs";
      //   Sentry.withScope((scope) => {
      //     if (ctx.route) scope.setTag("route", ctx.route);
      //     if (ctx.digest) scope.setTag("digest", ctx.digest);
      //     if (ctx.scope) scope.setTag("boundary_scope", ctx.scope);
      //     if (ctx.tags) {
      //       for (const [k, v] of Object.entries(ctx.tags)) {
      //         scope.setTag(k, v);
      //       }
      //     }
      //     Sentry.captureException(error);
      //   });
      //
      // The shape of logError(error, ctx) must remain stable across
      // that swap so call sites in app/[locale]/error.tsx and
      // app/global-error.tsx don't change.
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
    // Swallow. Observability must never escalate.
  }
}

export function logEvent(
  name: string,
  payload: Record<string, unknown> = {}
): void {
  try {
    if (hasDsn()) {
      // TODO(Phase 4): call into @sentry/nextjs here.
      //
      //   import * as Sentry from "@sentry/nextjs";
      //   Sentry.captureMessage(name, { level: "info", extra: payload });
      //
      // The shape of logEvent(name, payload) must remain stable
      // across that swap.
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
