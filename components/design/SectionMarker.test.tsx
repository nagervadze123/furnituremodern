// Element-tree tests for the Phase 6 Slice 2 SectionMarker primitive.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import { SectionMarker } from "./SectionMarker";
import { Eyebrow } from "./Eyebrow";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
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

describe("SectionMarker", () => {
  it("renders the label by itself when no numeral is given", () => {
    const tree = SectionMarker({ label: "Categories" }) as AnyElement;
    expect(flatText(tree)).toBe("Categories");
  });

  it("formats numeral + default separator + label", () => {
    const tree = SectionMarker({
      numeral: "I",
      label: "Categories",
    }) as AnyElement;
    expect(flatText(tree)).toBe("I. Categories");
  });

  it("supports the ' · ' editorial separator", () => {
    const tree = SectionMarker({
      numeral: "II",
      label: "The making",
      separator: " · ",
    }) as AnyElement;
    expect(flatText(tree)).toBe("II · The making");
  });

  it("supports the ' — ' editorial separator", () => {
    const tree = SectionMarker({
      numeral: "N°01",
      label: "Collection",
      separator: " — ",
    }) as AnyElement;
    expect(flatText(tree)).toBe("N°01 — Collection");
  });

  // SectionMarker is a thin composition over Eyebrow. The test
  // walks the unrendered tree, so the top-level element's `type` is
  // the Eyebrow function reference (not the string "span"); the
  // Eyebrow primitive's own tests in design.test.tsx already lock
  // the eyebrow typography contract end-to-end.
  it("delegates rendering to the Eyebrow primitive", () => {
    const tree = SectionMarker({
      numeral: "I",
      label: "Categories",
    }) as AnyElement;
    expect(tree.type).toBe(Eyebrow);
  });

  it("merges caller className passthrough into Eyebrow", () => {
    const tree = SectionMarker({
      numeral: "I",
      label: "Categories",
      className: "custom-cls",
    }) as AnyElement;
    // className flows from SectionMarker → Eyebrow as a prop. Eyebrow
    // is responsible for cn-merging it with its own typography
    // classes; we only verify SectionMarker forwards correctly.
    const props = tree.props as Record<string, unknown>;
    expect(props.className).toBe("custom-cls");
  });

  // Phase 6 terracotta-500 use rule — body-size text. SectionMarker
  // doesn't add any colour of its own (Eyebrow paints ink-500), so
  // verify the prop pass-through never includes terracotta-500.
  it("never paints terracotta-500 via the className prop", () => {
    const tree = SectionMarker({
      numeral: "I",
      label: "Categories",
    }) as AnyElement;
    const cn = (tree.props as { className?: string }).className ?? "";
    expect(cn).not.toContain("terracotta-500");
  });
});
