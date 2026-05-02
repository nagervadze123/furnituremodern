import { describe, it, expect } from "vitest";
import { createRateLimiter, log404Schema } from "./log-404";

describe("log404Schema", () => {
  it("accepts the shape sent by the browser beacon", () => {
    const result = log404Schema.safeParse({
      path: "/ka/sofas/missing",
      locale: "ka",
      referrer: "https://example.com/",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null locale and null referrer", () => {
    const result = log404Schema.safeParse({
      path: "/ka",
      locale: null,
      referrer: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty referrer string (browser sends '' when absent)", () => {
    const result = log404Schema.safeParse({
      path: "/ka",
      referrer: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing path", () => {
    const result = log404Schema.safeParse({ locale: "ka" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty path", () => {
    const result = log404Schema.safeParse({ path: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a path longer than 2048 chars", () => {
    const result = log404Schema.safeParse({ path: "/" + "a".repeat(2048) });
    expect(result.success).toBe(false);
  });

  it("rejects a referrer longer than 2048 chars", () => {
    const result = log404Schema.safeParse({
      path: "/ka",
      referrer: "x".repeat(2049),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string path", () => {
    const result = log404Schema.safeParse({ path: 123 });
    expect(result.success).toBe(false);
  });
});

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });
    expect(limiter("1.2.3.4")).toBe(true);
    expect(limiter("1.2.3.4")).toBe(true);
    expect(limiter("1.2.3.4")).toBe(true);
  });

  it("rejects the request that exceeds the limit", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });
    limiter("1.2.3.4");
    limiter("1.2.3.4");
    limiter("1.2.3.4");
    expect(limiter("1.2.3.4")).toBe(false);
  });

  it("resets the bucket once the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(limiter("1.2.3.4")).toBe(true);
    expect(limiter("1.2.3.4")).toBe(true);
    expect(limiter("1.2.3.4")).toBe(false);
    t = 1500;
    expect(limiter("1.2.3.4")).toBe(true);
  });

  it("isolates buckets per IP", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(limiter("1.2.3.4")).toBe(true);
    expect(limiter("1.2.3.4")).toBe(false);
    expect(limiter("5.6.7.8")).toBe(true);
  });
});
