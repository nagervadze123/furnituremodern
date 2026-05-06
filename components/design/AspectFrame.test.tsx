// Element-tree tests for the Phase 6 Slice 5 AspectFrame primitive.
// Locks the editorial frame contract: 1 px bone-200 hairline border
// plus a bone-100 inner background, no terracotta-500 paint
// anywhere on the wrapper itself.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import { AspectFrame } from "./AspectFrame";

type AnyElement = ReactElement<{
  className?: string;
  children?: unknown;
}> & { type: unknown };

describe("AspectFrame", () => {
  it("renders a <div> wrapper with the editorial border + bone-100 surface", () => {
    const tree = AspectFrame({
      ratio: "4/5",
      children: "x",
    }) as AnyElement;
    expect(tree.type).toBe("div");
    const cn = (tree.props.className ?? "") as string;
    expect(cn).toContain("border");
    expect(cn).toContain("border-[var(--color-bone-200)]");
    expect(cn).toContain("bg-[var(--color-bone-100)]");
    expect(cn).toContain("relative");
    expect(cn).toContain("w-full");
    expect(cn).toContain("overflow-hidden");
  });

  // Each ratio resolves to a Tailwind aspect class. Lock the
  // mapping so a future "let's switch to inline aspect-ratio CSS"
  // refactor surfaces in CI.
  it("maps each ratio onto the correct Tailwind aspect class", () => {
    const cases: Array<[Parameters<typeof AspectFrame>[0]["ratio"], string]> = [
      ["1/1", "aspect-square"],
      ["4/5", "aspect-[4/5]"],
      ["4/3", "aspect-[4/3]"],
      ["3/2", "aspect-[3/2]"],
      ["16/9", "aspect-video"],
    ];
    for (const [ratio, expected] of cases) {
      const tree = AspectFrame({ ratio, children: "x" }) as AnyElement;
      expect(tree.props.className).toContain(expected);
    }
  });

  it("merges caller className alongside the frame defaults", () => {
    const tree = AspectFrame({
      ratio: "3/2",
      className: "rounded-md shadow-lg",
      children: "x",
    }) as AnyElement;
    const cn = (tree.props.className ?? "") as string;
    expect(cn).toContain("rounded-md");
    expect(cn).toContain("shadow-lg");
    expect(cn).toContain("border-[var(--color-bone-200)]");
  });

  // Phase 6 terracotta-500 use rule — the editorial frame is a
  // light surface; no terracotta-500 paint of any kind on the
  // wrapper itself.
  it("never paints terracotta-500 on the frame wrapper", () => {
    const tree = AspectFrame({
      ratio: "4/5",
      children: "x",
    }) as AnyElement;
    const cn = (tree.props.className ?? "") as string;
    expect(cn).not.toContain("terracotta-500");
  });

  it("renders the supplied children inside the wrapper", () => {
    const tree = AspectFrame({
      ratio: "4/5",
      children: "marker",
    }) as AnyElement;
    expect(tree.props.children).toBe("marker");
  });
});
