// Element-tree tests for the Phase 6 Slice 6 Tag primitive.
// Locks both variant paint contracts and the `isNewProduct`
// predicate boundary cases.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactElement } from "react";

import { Tag, isNewProduct } from "./Tag";

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

describe("Tag", () => {
  it("renders a <span> with the supplied children", () => {
    const tree = Tag({ variant: "new", children: "NEW" }) as AnyElement;
    expect(tree.type).toBe("span");
    expect(flatText(tree)).toBe("NEW");
  });

  // Phase B Slice 6 — Tag 'new' variant paints bone-50 on
  // terracotta-600 (5.80:1, AA-clear for body-size text). Token-
  // anchored against the resolved CSS variable name so a Tailwind
  // class refactor can't drift past the rule silently. Locking
  // both the positive (terracotta-600) AND the negative
  // (NOT terracotta-500) so a future "let's revert to 500" goes
  // through review with the contrast trade-off surfaced.
  it("variant='new' paints bone-50 on terracotta-600 (AA-clear), not terracotta-500", () => {
    const tree = Tag({ variant: "new", children: "NEW" }) as AnyElement;
    const cn = (tree.props.className ?? "") as string;
    expect(cn).toContain("bg-[var(--color-terracotta-600)]");
    expect(cn).toContain("text-[var(--color-bone-50)]");
    expect(cn).not.toContain("var(--color-terracotta-500)");
  });

  // variant='neutral' is the default; no terracotta touch
  // anywhere. ink-700 on bone-100 + bone-200 hairline border.
  it("variant='neutral' (default) paints ink-700 on bone-100 with a bone-200 border", () => {
    const tree = Tag({ children: "TAG" }) as AnyElement;
    const cn = (tree.props.className ?? "") as string;
    expect(cn).toContain("text-[var(--color-ink-700)]");
    expect(cn).toContain("bg-[var(--color-bone-100)]");
    expect(cn).toContain("border-[var(--color-bone-200)]");
    expect(cn).not.toContain("terracotta");
  });

  it("merges caller className alongside the variant defaults", () => {
    const tree = Tag({
      variant: "new",
      className: "absolute left-2 top-2",
      children: "NEW",
    }) as AnyElement;
    const cn = (tree.props.className ?? "") as string;
    expect(cn).toContain("absolute");
    expect(cn).toContain("left-2");
    expect(cn).toContain("bg-[var(--color-terracotta-600)]");
  });

  it("applies the editorial tracking + uppercase voice on every variant", () => {
    for (const variant of ["new", "neutral"] as const) {
      const tree = Tag({ variant, children: "x" }) as AnyElement;
      const cn = (tree.props.className ?? "") as string;
      expect(cn).toContain("uppercase");
      expect(cn).toContain("tracking-[0.14em]");
      expect(cn).toContain("rounded-none");
    }
  });
});

describe("isNewProduct", () => {
  // Freeze "now" so the 30-day boundary tests are deterministic.
  const NOW = new Date("2026-06-01T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for a product created today", () => {
    expect(isNewProduct({ createdAt: "2026-06-01T08:00:00Z" })).toBe(true);
  });

  it("returns true for a product created 29 days ago", () => {
    expect(isNewProduct({ createdAt: "2026-05-03T12:00:00Z" })).toBe(true);
  });

  it("returns false for a product created 31 days ago", () => {
    expect(isNewProduct({ createdAt: "2026-05-01T12:00:00Z" })).toBe(false);
  });

  it("returns false for a product with no createdAt", () => {
    expect(isNewProduct({})).toBe(false);
  });

  it("returns false for an invalid createdAt value", () => {
    expect(isNewProduct({ createdAt: "not-a-date" })).toBe(false);
  });
});
