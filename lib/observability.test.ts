// Tests for the observability shim. We exercise both the silent
// production path and the dev-mode console.warn affordance, plus the
// "must never throw" guarantee that error.tsx and global-error.tsx
// rely on. With Phase 4 wiring complete, we also assert that errors
// reach @sentry/nextjs (mocked) when NEXT_PUBLIC_SENTRY_DSN is set.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted before any imports — vitest moves vi.mock() calls to the top
// of the module so the real @sentry/nextjs is never loaded in tests.
// The factory exposes captureException / captureMessage as vi.fn()
// stubs that we drive and assert on below.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";

import { logError, logEvent } from "./observability";

const captureException = Sentry.captureException as unknown as ReturnType<
  typeof vi.fn
>;
const captureMessage = Sentry.captureMessage as unknown as ReturnType<
  typeof vi.fn
>;

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

function setEnv(values: { nodeEnv?: string; dsn?: string | undefined }) {
  // Node coerces `process.env.X = undefined` to the string "undefined"
  // (truthy!), which silently breaks the no-DSN code path. Delete the
  // key when the test wants the var unset.
  const env = process.env as unknown as Record<string, string | undefined>;
  if ("nodeEnv" in values) {
    if (values.nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = values.nodeEnv;
  }
  if ("dsn" in values) {
    if (values.dsn === undefined) delete env.NEXT_PUBLIC_SENTRY_DSN;
    else env.NEXT_PUBLIC_SENTRY_DSN = values.dsn;
  }
}

describe("observability", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    captureException.mockReset();
    captureMessage.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    setEnv({ nodeEnv: ORIGINAL_NODE_ENV, dsn: ORIGINAL_DSN });
  });

  it("is a silent no-op in production with no DSN configured", () => {
    setEnv({ nodeEnv: "production", dsn: undefined });

    logError(new Error("boom"), { route: "/ka", scope: "route" });
    logEvent("page_render_failed", { reason: "supabase_timeout" });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("emits a console.warn in development with no DSN configured", () => {
    setEnv({ nodeEnv: "development", dsn: undefined });

    logError(new Error("boom"), { route: "/ka", scope: "route" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warnSpy.mock.calls[0]!;
    expect(prefix).toContain("[observability]");
    expect(prefix).toContain("logError");
    expect(typeof payload).toBe("string");
    expect(payload).toContain("/ka");
    expect(payload).toContain("route");
  });

  it("accepts unknown error shapes (string, plain object, null, undefined) without throwing", () => {
    setEnv({ nodeEnv: "production", dsn: undefined });

    expect(() => logError("string error")).not.toThrow();
    expect(() => logError({ message: "plain object" })).not.toThrow();
    expect(() => logError(null)).not.toThrow();
    expect(() => logError(undefined)).not.toThrow();
    expect(() => logError(new Error("real error"))).not.toThrow();
  });

  it("logEvent accepts arbitrary payload shapes without throwing", () => {
    setEnv({ nodeEnv: "production", dsn: undefined });

    expect(() => logEvent("a")).not.toThrow();
    expect(() => logEvent("b", {})).not.toThrow();
    expect(() => logEvent("c", { nested: { deep: [1, 2, 3] } })).not.toThrow();
    expect(() => logEvent("d", { date: new Date(), regex: /abc/ })).not.toThrow();
  });

  it("does not throw on circular references in error or payload", () => {
    setEnv({ nodeEnv: "development", dsn: undefined });

    type CircularNode = { self?: CircularNode };
    const circular: CircularNode = {};
    circular.self = circular;

    expect(() => logError(circular)).not.toThrow();
    expect(() => logEvent("circular", { circular })).not.toThrow();
    // Make sure the dev warn still ran (i.e. the safe-stringify path
    // didn't bail out entirely).
    expect(warnSpy).toHaveBeenCalled();
  });

  it("propagates context tags through to dev-mode output", () => {
    setEnv({ nodeEnv: "development", dsn: undefined });

    logError(new Error("tagged"), {
      route: "/en/sofas/missing",
      digest: "abc123",
      scope: "boundary",
      tags: { release: "phase-3", surface: "search" },
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const payload = warnSpy.mock.calls[0]?.[1];
    expect(payload).toContain("/en/sofas/missing");
    expect(payload).toContain("abc123");
    expect(payload).toContain("boundary");
    expect(payload).toContain("phase-3");
    expect(payload).toContain("search");
  });

  it("suppresses dev warn when DSN is set (Sentry path takes over)", () => {
    setEnv({ nodeEnv: "development", dsn: "https://fake@example.ingest.sentry.io/0" });

    logError(new Error("boom"));
    logEvent("phase4");

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("forwards logError to Sentry.captureException when DSN is set", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });
    const err = new Error("boom");

    logError(err, { route: "/ka/sofas/foo", scope: "route", digest: "abc123" });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [capturedError, captureCtx] = captureException.mock.calls[0]!;
    expect(capturedError).toBe(err);
    expect(captureCtx).toMatchObject({
      tags: { route: "/ka/sofas/foo", scope: "route" },
      extra: { digest: "abc123" },
    });
  });

  it("forwards logEvent to Sentry.captureMessage with info level when DSN is set", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });

    logEvent("page_render_failed", { reason: "supabase_timeout" });

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [name, options] = captureMessage.mock.calls[0]!;
    expect(name).toBe("page_render_failed");
    expect(options).toMatchObject({
      level: "info",
      extra: { reason: "supabase_timeout" },
    });
  });

  it("propagates custom ctx.tags through to Sentry.captureException", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });

    logError(new Error("tagged"), {
      route: "/en/page",
      scope: "boundary",
      tags: { release: "phase-4", surface: "search" },
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [, captureCtx] = captureException.mock.calls[0]!;
    expect(captureCtx?.tags).toMatchObject({
      route: "/en/page",
      scope: "boundary",
      release: "phase-4",
      surface: "search",
    });
  });

  it("does not call Sentry when DSN is unset", () => {
    setEnv({ nodeEnv: "production", dsn: undefined });

    logError(new Error("boom"), { route: "/ka", scope: "route" });
    logEvent("noop", { foo: "bar" });

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("still accepts unknown error shapes when DSN is set", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });

    expect(() => logError("string error")).not.toThrow();
    expect(() => logError({ message: "plain object" })).not.toThrow();
    expect(() => logError(null)).not.toThrow();
    expect(() => logError(undefined)).not.toThrow();
    expect(() => logError(new Error("real"))).not.toThrow();

    // All five calls forwarded to Sentry.
    expect(captureException).toHaveBeenCalledTimes(5);
  });

  it("swallows errors thrown by Sentry.captureException itself", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });
    captureException.mockImplementationOnce(() => {
      throw new Error("Sentry transport failed");
    });

    expect(() => logError(new Error("inner"))).not.toThrow();
  });

  it("swallows errors thrown by Sentry.captureMessage itself", () => {
    setEnv({ nodeEnv: "production", dsn: "https://fake@example.ingest.sentry.io/0" });
    captureMessage.mockImplementationOnce(() => {
      throw new Error("Sentry transport failed");
    });

    expect(() => logEvent("trigger")).not.toThrow();
  });
});
