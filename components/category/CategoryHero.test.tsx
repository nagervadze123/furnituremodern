// Element-tree tests for CategoryHero. Same pattern as
// components/design/design.test.tsx — call the function component
// directly and walk the returned React tree without a DOM.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import { CategoryHero } from "./CategoryHero";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  src?: string;
  alt?: string;
  id?: string;
  variant?: unknown;
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

function findFirstWith(
  node: unknown,
  predicate: (el: AnyElement) => boolean
): AnyElement | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findFirstWith(child, predicate);
      if (found) return found;
    }
    return null;
  }
  const el = node as AnyElement;
  if (predicate(el)) return el;
  return findFirstWith(
    (el.props as Record<string, unknown>)?.children,
    predicate
  );
}

describe("CategoryHero", () => {
  const baseProps = {
    name: "Sofas",
    intro: "A long intro paragraph about sofas.",
  };

  it("renders the category name and intro text", () => {
    const tree = CategoryHero(baseProps) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain("Sofas");
    expect(text).toContain("A long intro paragraph about sofas.");
  });

  it("renders the headline through the Display component with as=\"h1\"", () => {
    const tree = CategoryHero(baseProps) as AnyElement;
    // The headline is rendered through <Display> — find the element
    // whose type is a function (component) and whose `as` prop is "h1".
    const heading = findFirstWith(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof el.type === "function" && props?.as === "h1";
    });
    expect(heading).not.toBeNull();
    expect((heading?.props as Record<string, unknown>)?.id).toBe(
      "category-headline"
    );
  });

  it("falls back to the minimalist (no image) layout when imageUrl is omitted", () => {
    const tree = CategoryHero(baseProps) as AnyElement;
    // Minimalist layout is the centred narrow column — no Next/Image
    // descendant should be present in the tree.
    const img = findFirstWith(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props?.src === "string" && typeof props?.sizes === "string";
    });
    expect(img).toBeNull();
  });

  it("renders the asymmetric prose+image layout when imageUrl is supplied", () => {
    const tree = CategoryHero({
      ...baseProps,
      imageUrl: "https://example.test/cover.jpg",
      imageAlt: "alt text",
    }) as AnyElement;
    const img = findFirstWith(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return props?.src === "https://example.test/cover.jpg";
    });
    expect(img).not.toBeNull();
    expect(img?.props.alt).toBe("alt text");
  });

  it("renders the eyebrow when supplied", () => {
    const tree = CategoryHero({
      ...baseProps,
      eyebrow: "Collection",
    }) as AnyElement;
    expect(flatText(tree)).toContain("Collection");
  });

  it("omits the eyebrow when not supplied", () => {
    const tree = CategoryHero(baseProps) as AnyElement;
    expect(flatText(tree)).not.toContain("Collection");
  });
});
