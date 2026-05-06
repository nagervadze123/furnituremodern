// Element-tree tests for the Phase 6 Slice 5 EditorialHeading
// primitive. Locks the D4 API decision: variant is the entire size
// API; tag defaults follow the typical scale-to-role mapping;
// className passthrough merges with the variant class; the absence
// of any `sizeOverride` prop is the contract.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import { EditorialHeading } from "./EditorialHeading";

type AnyElement = ReactElement<{
  className?: string;
  children?: unknown;
}> & { type: unknown };

function flatText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatText).join("");
  if (typeof node === "object" && "props" in (node as AnyElement)) {
    return flatText((node as AnyElement).props?.children);
  }
  return "";
}

describe("EditorialHeading", () => {
  it("hero variant renders <h1> with the .display-hero class", () => {
    const tree = EditorialHeading({
      variant: "hero",
      children: "Headline",
    }) as AnyElement;
    expect(tree.type).toBe("h1");
    expect(tree.props.className).toContain("display-hero");
    expect(flatText(tree)).toBe("Headline");
  });

  it("variant 1 renders <h1> with the .display-1 class", () => {
    const tree = EditorialHeading({
      variant: 1,
      children: "Headline",
    }) as AnyElement;
    expect(tree.type).toBe("h1");
    expect(tree.props.className).toContain("display-1");
  });

  it("variant 2 renders <h2> with the .display-2 class", () => {
    const tree = EditorialHeading({
      variant: 2,
      children: "Headline",
    }) as AnyElement;
    expect(tree.type).toBe("h2");
    expect(tree.props.className).toContain("display-2");
  });

  it("variant 3 renders <h3> with the .display-3 class", () => {
    const tree = EditorialHeading({
      variant: 3,
      children: "Headline",
    }) as AnyElement;
    expect(tree.type).toBe("h3");
    expect(tree.props.className).toContain("display-3");
  });

  // The `as` prop overrides the default tag without touching the
  // visual scale — useful when the document outline disagrees with
  // the typographic scale.
  it("`as` overrides the default semantic tag", () => {
    const tree = EditorialHeading({
      variant: 2,
      as: "h1",
      children: "Headline",
    }) as AnyElement;
    expect(tree.type).toBe("h1");
    expect(tree.props.className).toContain("display-2");
  });

  // className passthrough merges via cn; the variant class always
  // wins on conflict because it lands first in the cn() call.
  it("merges caller className alongside the variant class", () => {
    const tree = EditorialHeading({
      variant: 1,
      className: "text-[var(--color-bone-50)]",
      children: "Headline",
    }) as AnyElement;
    expect(tree.props.className).toContain("display-1");
    expect(tree.props.className).toContain("text-[var(--color-bone-50)]");
  });

  // Variant maps onto a single CSS class — the size scale is owned
  // by globals.css, not by Tailwind utilities baked into the React
  // component. Lock this so a future "let's port the type scale to
  // Tailwind theme tokens" refactor has to update the test
  // deliberately rather than drifting past it.
  it("never inlines arbitrary text-size utilities", () => {
    const variants = ["hero", 1, 2, 3] as const;
    for (const variant of variants) {
      const tree = EditorialHeading({
        variant,
        children: "x",
      }) as AnyElement;
      const cn = (tree.props.className ?? "") as string;
      expect(cn).not.toMatch(/text-\[\d+\.?\d*rem\]/);
    }
  });
});
