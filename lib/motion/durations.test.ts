// Tests for the motion duration tokens. Pure data — same shape and
// invariant guarantees the rest of the design system relies on.

import { describe, it, expect } from "vitest";
import { DURATIONS } from "./durations";

describe("DURATIONS", () => {
  it("declares fast / base / slow / slower / lazy", () => {
    expect(Object.keys(DURATIONS).sort()).toEqual(
      ["fast", "base", "slow", "slower", "lazy"].sort()
    );
  });

  it("every value is a positive integer in milliseconds", () => {
    for (const [key, value] of Object.entries(DURATIONS)) {
      expect(Number.isInteger(value), `DURATIONS.${key}`).toBe(true);
      expect(value, `DURATIONS.${key}`).toBeGreaterThan(0);
    }
  });

  it("orders fast < base < slow < slower < lazy", () => {
    expect(DURATIONS.fast).toBeLessThan(DURATIONS.base);
    expect(DURATIONS.base).toBeLessThan(DURATIONS.slow);
    expect(DURATIONS.slow).toBeLessThan(DURATIONS.slower);
    expect(DURATIONS.slower).toBeLessThan(DURATIONS.lazy);
  });

  it("matches the spec values (150 / 250 / 400 / 600 / 800)", () => {
    expect(DURATIONS.fast).toBe(150);
    expect(DURATIONS.base).toBe(250);
    expect(DURATIONS.slow).toBe(400);
    expect(DURATIONS.slower).toBe(600);
    expect(DURATIONS.lazy).toBe(800);
  });
});
