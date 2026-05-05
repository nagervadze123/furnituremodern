// Render tests for the design primitive components in components/design.
// Tests run in node (no DOM) — we walk the React element tree the same
// way lib/og/og.test.tsx and lib/motion/components.test.tsx do.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import {
  AspectImage,
  Body,
  Container,
  Display,
  Eyebrow,
  Heading,
  Section,
} from "./index";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  style?: Record<string, unknown>;
  "aria-labelledby"?: string;
  src?: string;
  alt?: string;
  id?: string;
  sizes?: string;
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
  return findFirstWith((el.props as Record<string, unknown>)?.children, predicate);
}

describe("Container", () => {
  it("renders children inside a div", () => {
    const tree = Container({ children: "x" }) as AnyElement;
    expect(tree.type).toBe("div");
    expect(flatText(tree)).toBe("x");
  });

  it("default variant uses max-w-6xl", () => {
    const tree = Container({ children: "x" }) as AnyElement;
    expect(tree.props.className).toMatch(/max-w-6xl/);
  });

  it("narrow variant uses max-w-3xl", () => {
    const tree = Container({
      children: "x",
      variant: "narrow",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/max-w-3xl/);
  });

  it("wide variant uses the 1760px editorial cap", () => {
    const tree = Container({
      children: "x",
      variant: "wide",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/max-w-\[1760px\]/);
  });

  it("full variant uses max-w-none", () => {
    const tree = Container({
      children: "x",
      variant: "full",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/max-w-none/);
  });

  it("applies horizontal padding (px-4 base, sm:px-6, lg:px-8)", () => {
    const tree = Container({ children: "x" }) as AnyElement;
    expect(tree.props.className).toMatch(/px-4/);
    expect(tree.props.className).toMatch(/sm:px-6/);
    expect(tree.props.className).toMatch(/lg:px-8/);
  });

  it("merges className passthrough", () => {
    const tree = Container({
      children: "x",
      className: "custom-cls",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/custom-cls/);
  });
});

describe("Section", () => {
  it("renders children inside a <section> tag", () => {
    const tree = Section({ children: "x" }) as AnyElement;
    expect(tree.type).toBe("section");
    expect(flatText(tree)).toBe("x");
  });

  it("default variant uses py-22", () => {
    const tree = Section({ children: "x" }) as AnyElement;
    expect(tree.props.className).toMatch(/py-22/);
  });

  it("large variant uses py-30", () => {
    const tree = Section({
      children: "x",
      variant: "large",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/py-30/);
  });

  it("hero variant uses py-44", () => {
    const tree = Section({
      children: "x",
      variant: "hero",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/py-44/);
  });

  it("forwards aria-labelledby", () => {
    const tree = Section({
      children: "x",
      "aria-labelledby": "section-heading",
    }) as AnyElement;
    expect(tree.props["aria-labelledby"]).toBe("section-heading");
  });
});

describe("Eyebrow", () => {
  it("renders a span by default", () => {
    const tree = Eyebrow({ children: "label" }) as AnyElement;
    expect(tree.type).toBe("span");
    expect(flatText(tree)).toBe("label");
  });

  it("applies uppercase, tracking, and a small text class", () => {
    const tree = Eyebrow({ children: "label" }) as AnyElement;
    expect(tree.props.className).toMatch(/uppercase/);
    expect(tree.props.className).toMatch(/tracking/);
    expect(tree.props.className).toMatch(/text-xs|text-\[0\.75rem\]/);
  });

  // Phase 6 Slice 0 — terracotta-500 fails AA at 12 px (4.25:1 on
  // bone-50). Default eyebrow text now paints ink-500 (5.59:1,
  // AA-clear). The brand accent at body size lives in the .eyebrow
  // class hairline (Phase A), not the text itself. Regression-guard
  // both directions.
  it("paints ink-500 by default and never terracotta-500", () => {
    const tree = Eyebrow({ children: "label" }) as AnyElement;
    expect(tree.props.className).toContain("text-[var(--color-ink-500)]");
    expect(tree.props.className).not.toContain("text-[var(--color-terracotta-500)]");
  });
});

describe("Display", () => {
  it("renders an h1 by default", () => {
    const tree = Display({ children: "Hi" }) as AnyElement;
    expect(tree.type).toBe("h1");
  });

  it("variant=1 applies a 4rem-class line", () => {
    const tree = Display({ children: "Hi", variant: 1 }) as AnyElement;
    expect(tree.props.className).toMatch(/text-/);
  });

  it("supports `as` polymorphic override", () => {
    const tree = Display({ children: "Hi", as: "p" }) as AnyElement;
    expect(tree.type).toBe("p");
  });
});

describe("Heading", () => {
  it("default tag is h2", () => {
    const tree = Heading({ children: "Hi" }) as AnyElement;
    expect(tree.type).toBe("h2");
  });

  it("variant=3 default tag is h3", () => {
    const tree = Heading({ children: "Hi", variant: 3 }) as AnyElement;
    expect(tree.type).toBe("h3");
  });

  it("supports `as` polymorphic override", () => {
    const tree = Heading({ children: "Hi", as: "h4" }) as AnyElement;
    expect(tree.type).toBe("h4");
  });
});

describe("Body", () => {
  it("renders a p by default", () => {
    const tree = Body({ children: "x" }) as AnyElement;
    expect(tree.type).toBe("p");
  });

  it("variant=lg applies a larger text class", () => {
    const tree = Body({ children: "x", variant: "lg" }) as AnyElement;
    expect(tree.props.className).toMatch(/text-/);
  });
});

describe("AspectImage", () => {
  const baseProps = {
    src: "/image.jpg",
    alt: "alt text",
    sizes: "(max-width: 768px) 100vw, 50vw",
  };

  it("wraps Next/Image in a div with the requested aspect ratio class", () => {
    const tree = AspectImage({
      ...baseProps,
      ratio: "1/1",
    }) as AnyElement;
    // Outer wrapper class enforces aspect-square or similar.
    expect(tree.props.className).toMatch(/aspect-/);
  });

  it("default ratio is 4/5 (portrait card)", () => {
    const tree = AspectImage(baseProps) as AnyElement;
    expect(tree.props.className).toMatch(/aspect-\[4\/5\]/);
  });

  it("supports the cinematic 21/9 ratio", () => {
    const tree = AspectImage({
      ...baseProps,
      ratio: "21/9",
    }) as AnyElement;
    expect(tree.props.className).toMatch(/aspect-\[21\/9\]/);
  });

  it("includes a Next/Image child with src + alt", () => {
    const tree = AspectImage(baseProps) as AnyElement;
    const img = findFirstWith(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof el.type !== "string" && props.src === "/image.jpg";
    });
    expect(img).not.toBeNull();
    expect(img?.props.alt).toBe("alt text");
    expect(img?.props.sizes).toBe(baseProps.sizes);
  });
});
