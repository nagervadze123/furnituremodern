// WCAG 2.x contrast helpers.
//
// These compute the relative-luminance contrast ratio between two
// colors per the WCAG specification:
//   • https://www.w3.org/TR/WCAG21/#contrast-minimum
//   • https://www.w3.org/TR/WCAG21/#contrast-enhanced
//
// We use these to lock the documented brand-color findings into the
// test suite — if a future brand-token tweak silently moves a ratio
// below the AA floor (4.5:1 body text, 3:1 non-text), the tests fail
// loudly. The math here is the official W3C formula; do not swap it
// for a perceptually-uniform alternative (APCA) without updating the
// thresholds together.
//
// Phase 4 Task 4 (accessibility audit) added these. The brand-token
// contrast comments in lib/site-config.ts cite the values these
// helpers compute; lib/a11y/contrast.test.ts pins them.

export type RGB = { r: number; g: number; b: number };

// Linearize a single sRGB channel into the value used by the
// relative-luminance formula. Channel arrives in 0–1.
function srgbToLinear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

// Relative luminance of an sRGB color, per WCAG. Result is in 0–1.
export function relativeLuminance({ r, g, b }: RGB): number {
  const rL = srgbToLinear(r / 255);
  const gL = srgbToLinear(g / 255);
  const bL = srgbToLinear(b / 255);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

// Parse a #RRGGBB or #RGB hex string into an RGB triple. Throws on
// malformed input — these helpers run inside test invariants, so a
// silent fallback would mask the failure mode they exist to detect.
export function parseHex(hex: string): RGB {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  let h = match[1]!;
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// WCAG 2.x contrast ratio between two colors. Always ≥ 1, ≤ 21. The
// formula is symmetric — order of arguments doesn't matter — so we
// always orient lighter / darker before dividing.
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Convenience wrapper for the common "two hex strings" case.
export function contrastRatioHex(aHex: string, bHex: string): number {
  return contrastRatio(parseHex(aHex), parseHex(bHex));
}

// WCAG thresholds. The AAA targets are stricter; we use these as
// labels in tests so a regression points at the exact criterion.
export const WCAG_AA_BODY = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AA_NON_TEXT = 3;
export const WCAG_AAA_BODY = 7;
export const WCAG_AAA_LARGE = 4.5;

// True when the ratio meets the criterion. Use the named constants
// rather than passing magic numbers so test failures read nicely.
export function meets(ratio: number, threshold: number): boolean {
  return ratio >= threshold;
}
