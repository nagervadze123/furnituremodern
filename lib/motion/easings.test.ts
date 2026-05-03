import { describe, it, expect } from "vitest";
import { EASINGS } from "./easings";

describe("EASINGS", () => {
  it("declares standard / enter / exit / emphasis / spring", () => {
    expect(Object.keys(EASINGS).sort()).toEqual(
      ["standard", "enter", "exit", "emphasis", "spring"].sort()
    );
  });

  it("cubic-bezier easings are 4-tuple arrays of numbers", () => {
    for (const key of ["standard", "enter", "exit", "emphasis"] as const) {
      const v = EASINGS[key] as readonly number[];
      expect(Array.isArray(v), `EASINGS.${key}`).toBe(true);
      expect(v.length, `EASINGS.${key}.length`).toBe(4);
      for (const n of v) {
        expect(typeof n, `EASINGS.${key} entry`).toBe("number");
        expect(n, `EASINGS.${key} entry`).toBeGreaterThanOrEqual(0);
        expect(n, `EASINGS.${key} entry`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("spring is a transition object", () => {
    expect(EASINGS.spring).toMatchObject({
      type: "spring",
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
  });

  it("standard is the canonical Material 4-0-2-1 ease", () => {
    expect(EASINGS.standard).toEqual([0.4, 0, 0.2, 1]);
  });
});
