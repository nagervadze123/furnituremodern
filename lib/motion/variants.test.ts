import { describe, it, expect } from "vitest";
import {
  fadeIn,
  slideUp,
  slideUpStagger,
  scaleIn,
  imageReveal,
} from "./variants";
import { DURATIONS } from "./durations";

describe("CSS motion variants — shape", () => {
  const variants = { fadeIn, slideUp, scaleIn, imageReveal };

  it("each variant declares hidden + visible CSS plus duration + easing", () => {
    for (const [name, v] of Object.entries(variants)) {
      expect(v.hidden, `${name}.hidden`).toBeDefined();
      expect(v.visible, `${name}.visible`).toBeDefined();
      expect(v.durationMs, `${name}.durationMs`).toBeGreaterThan(0);
      expect(Array.isArray(v.easing), `${name}.easing`).toBe(true);
      expect((v.easing as readonly number[]).length).toBe(4);
    }
  });
});

describe("fadeIn", () => {
  it("opacity 0 → 1", () => {
    expect(fadeIn.hidden.opacity).toBe(0);
    expect(fadeIn.visible.opacity).toBe(1);
  });
});

describe("slideUp", () => {
  it("translates from translateY(>0) to translateY(0) and fades in", () => {
    expect(slideUp.hidden.transform).toMatch(/translateY\(\d+px\)/);
    expect(slideUp.visible.transform).toBe("translateY(0)");
    expect(slideUp.hidden.opacity).toBe(0);
    expect(slideUp.visible.opacity).toBe(1);
  });
});

describe("scaleIn", () => {
  it("scales from <1 to 1 and fades in", () => {
    expect(scaleIn.hidden.transform).toMatch(/scale\(0\.\d+\)/);
    expect(scaleIn.visible.transform).toBe("scale(1)");
    expect(scaleIn.hidden.opacity).toBe(0);
    expect(scaleIn.visible.opacity).toBe(1);
  });
});

describe("imageReveal", () => {
  it("uses clip-path inset 100% → 0", () => {
    expect(imageReveal.hidden.clipPath).toMatch(/inset.*100%/);
    expect(imageReveal.visible.clipPath).toMatch(/inset\(0/);
  });

  it("runs at the slower duration token (clip-path needs more breathing room)", () => {
    expect(imageReveal.durationMs).toBe(DURATIONS.slower);
  });
});

describe("slideUpStagger", () => {
  it("declares staggerMs, delayChildrenMs, maxStaggerSlots", () => {
    expect(slideUpStagger.staggerMs).toBeGreaterThan(0);
    expect(slideUpStagger.delayChildrenMs).toBeGreaterThanOrEqual(0);
    expect(slideUpStagger.maxStaggerSlots).toBeGreaterThan(1);
  });
});
