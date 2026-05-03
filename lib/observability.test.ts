// Tests for the observability shim. We exercise both the silent
// production path and the dev-mode console.warn affordance, plus the
// "must never throw" guarantee that error.tsx and global-error.tsx
// rely on.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logError, logEvent } from "./observability";

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

  it("suppresses dev warn when DSN is set (Phase 4 placeholder no-op path)", () => {
    setEnv({ nodeEnv: "development", dsn: "https://fake@example.ingest.sentry.io/0" });

    logError(new Error("boom"));
    logEvent("phase4");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
