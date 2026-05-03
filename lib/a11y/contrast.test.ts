import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  contrastRatioHex,
  meets,
  parseHex,
  relativeLuminance,
  WCAG_AA_BODY,
  WCAG_AA_LARGE,
  WCAG_AA_NON_TEXT,
  WCAG_AAA_BODY,
} from "./contrast";
import { brandTokens } from "@/lib/site-config";

describe("parseHex", () => {
  it("parses 6-digit hex with leading hash", () => {
    expect(parseHex("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses 6-digit hex without leading hash", () => {
    expect(parseHex("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 3-digit shorthand", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("#abc")).toEqual({ r: 170, g: 187, b: 204 });
  });

  it("is case-insensitive", () => {
    expect(parseHex("#ABCDEF")).toEqual(parseHex("#abcdef"));
  });

  it("throws on malformed input", () => {
    expect(() => parseHex("not-a-color")).toThrow(/Invalid hex color/);
    expect(() => parseHex("#12")).toThrow(/Invalid hex color/);
    expect(() => parseHex("#xyz")).toThrow(/Invalid hex color/);
  });
});

describe("relativeLuminance", () => {
  it("white is luminance 1.0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1.0, 4);
  });

  it("black is luminance 0", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0.0, 4);
  });

  it("monotonic — pure red < pure green (per WCAG weights)", () => {
    const red = relativeLuminance({ r: 255, g: 0, b: 0 });
    const green = relativeLuminance({ r: 0, g: 255, b: 0 });
    expect(green).toBeGreaterThan(red);
  });
});

describe("contrastRatio", () => {
  it("white-on-black is 21:1 (the WCAG max)", () => {
    const ratio = contrastRatio(
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 }
    );
    expect(ratio).toBeCloseTo(21, 1);
  });

  it("same color is 1:1", () => {
    const ratio = contrastRatio(
      { r: 100, g: 100, b: 100 },
      { r: 100, g: 100, b: 100 }
    );
    expect(ratio).toBeCloseTo(1, 4);
  });

  it("is symmetric — order of arguments doesn't change the ratio", () => {
    const a = { r: 184, g: 92, b: 56 };
    const b = { r: 251, g: 248, b: 243 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 6);
  });
});

describe("meets", () => {
  it("true when the ratio is exactly equal to the threshold", () => {
    expect(meets(4.5, WCAG_AA_BODY)).toBe(true);
  });

  it("false when the ratio is below the threshold", () => {
    expect(meets(4.49, WCAG_AA_BODY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Brand-token invariants — locks the findings documented in
// lib/site-config.ts. If a future tweak to the brand palette breaks
// one of these, the test points at the exact criterion that drifted.
// ---------------------------------------------------------------------------

describe("brand token contrast invariants", () => {
  it("foreground on background passes AAA body (target 7:1)", () => {
    const ratio = contrastRatioHex(
      brandTokens.foreground,
      brandTokens.background
    );
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA_BODY);
  });

  it("muted on background passes AA body (target 4.5:1)", () => {
    const ratio = contrastRatioHex(brandTokens.muted, brandTokens.background);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  });

  it("muted on background fails AAA body — documented trade-off (target 7:1)", () => {
    // This test pins the documented finding. If a brand tweak ever
    // bumps muted contrast above 7:1 (e.g. operator picks #5a4f3f),
    // delete this test in the same commit so it doesn't go stale.
    const ratio = contrastRatioHex(brandTokens.muted, brandTokens.background);
    expect(ratio).toBeLessThan(WCAG_AAA_BODY);
  });

  it("accent on background passes AA non-text (target 3:1) — focus ring + OG band", () => {
    const ratio = contrastRatioHex(brandTokens.accent, brandTokens.background);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT);
  });

  it("accent on background passes AA large text (target 3:1)", () => {
    const ratio = contrastRatioHex(brandTokens.accent, brandTokens.background);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });

  it("accent on background fails AA body — documented trade-off (target 4.5:1)", () => {
    // Pins the rationale comment in lib/site-config.ts: today the
    // accent is used only as a non-text color (focus ring, OG band)
    // and never as body-text foreground. If a future commit promotes
    // accent to body text, this test fails — at which point the
    // operator must approve a darker shade per the proposed
    // replacements (#9a4a25 for AA, #7d3a18 for AAA).
    const ratio = contrastRatioHex(brandTokens.accent, brandTokens.background);
    expect(ratio).toBeLessThan(WCAG_AA_BODY);
  });
});
