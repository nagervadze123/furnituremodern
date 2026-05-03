// Unit tests for the OG/Twitter template builders. We don't compare
// raw image bytes (Satori's PNG output is deterministic but the test
// would be brittle to any cosmetic tweak); instead we walk the JSX
// tree and assert on structural properties — locale flips font, square
// mode flips the layout dial, missing optional props don't throw.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";

import {
  buildBaseTemplate,
  buildCategoryTemplate,
  buildErrorTemplate,
  buildProductTemplate,
  shortenIntro,
  OG_DIMENSIONS,
  SQUARE_DIMENSIONS,
  isSquare,
  headlineFontFamily,
  OG_FONT_FAMILY,
} from "./index";

type AnyElement = ReactElement<{
  style?: Record<string, unknown>;
  children?: unknown;
}>;

/** Recursively collect every JSX element in a tree. */
function flatten(node: unknown, out: AnyElement[] = []): AnyElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out);
    return out;
  }
  const el = node as AnyElement;
  if (el && typeof el === "object" && "type" in el) {
    out.push(el);
    const kids = el.props?.children;
    if (kids !== undefined) flatten(kids, out);
  }
  return out;
}

/** Find the first text node in a tree. */
function firstText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstText(child);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof node === "object" && "props" in (node as AnyElement)) {
    return firstText((node as AnyElement).props?.children);
  }
  return null;
}

/** True if any node's style.fontFamily mentions `family`. */
function treeReferencesFont(tree: AnyElement, family: string): boolean {
  return flatten(tree).some((el) => {
    const ff = el.props?.style?.fontFamily;
    return typeof ff === "string" && ff.includes(family);
  });
}

describe("dimensions", () => {
  it("OG_DIMENSIONS is 1200×630 standard Open Graph", () => {
    expect(OG_DIMENSIONS).toEqual({ width: 1200, height: 630 });
    expect(isSquare(OG_DIMENSIONS)).toBe(false);
  });

  it("SQUARE_DIMENSIONS is 600×600 (LinkedIn / iMessage tile)", () => {
    expect(SQUARE_DIMENSIONS).toEqual({ width: 600, height: 600 });
    expect(isSquare(SQUARE_DIMENSIONS)).toBe(true);
  });
});

describe("headlineFontFamily", () => {
  it("ka uses Noto Serif Georgian", () => {
    expect(headlineFontFamily("ka")).toBe(OG_FONT_FAMILY.georgianSerif);
  });

  it("en uses Fraunces", () => {
    expect(headlineFontFamily("en")).toBe(OG_FONT_FAMILY.latinDisplay);
  });
});

describe("buildBaseTemplate", () => {
  it("renders the title text", () => {
    const tree = buildBaseTemplate({
      title: "Hello world",
      locale: "en",
    });
    const flat = flatten(tree);
    const titles = flat.map((el) => firstText(el.props?.children));
    expect(titles).toContain("Hello world");
  });

  it("ka locale references the Noto Serif Georgian font family", () => {
    const tree = buildBaseTemplate({
      title: "გამარჯობა",
      locale: "ka",
    });
    expect(treeReferencesFont(tree, OG_FONT_FAMILY.georgianSerif)).toBe(true);
  });

  it("en locale references the Fraunces font family", () => {
    const tree = buildBaseTemplate({
      title: "Hello",
      locale: "en",
    });
    expect(treeReferencesFont(tree, OG_FONT_FAMILY.latinDisplay)).toBe(true);
  });

  it("does not throw when subtitle, eyebrow and footerText are omitted", () => {
    expect(() =>
      buildBaseTemplate({ title: "Just a title", locale: "en" })
    ).not.toThrow();
  });

  it("square mode produces a different layout (smaller padding) than landscape", () => {
    const og = buildBaseTemplate({
      title: "X",
      locale: "en",
      size: OG_DIMENSIONS,
    });
    const square = buildBaseTemplate({
      title: "X",
      locale: "en",
      size: SQUARE_DIMENSIONS,
    });
    // Look at the first node that actually carries a padding declaration —
    // the accent band sits before the header, so the index isn't fixed.
    const findPadding = (tree: AnyElement): string | undefined => {
      for (const el of flatten(tree)) {
        const p = el.props?.style?.padding;
        if (typeof p === "string" && p.length > 0) return p;
      }
      return undefined;
    };
    const ogPadding = findPadding(og);
    const squarePadding = findPadding(square);
    expect(ogPadding).toBeDefined();
    expect(squarePadding).toBeDefined();
    expect(ogPadding).not.toEqual(squarePadding);
  });
});

describe("buildProductTemplate", () => {
  it("falls back to monogram-only layout when productImageUrl is missing", () => {
    const tree = buildProductTemplate({
      productName: "Linen sofa",
      formattedPrice: "₾2,400",
      locale: "en",
    });
    // No <img> element should appear in the tree.
    const hasImg = flatten(tree).some((el) => el.type === "img");
    expect(hasImg).toBe(false);
  });

  it("renders an <img> when productImageUrl is provided", () => {
    const tree = buildProductTemplate({
      productName: "Linen sofa",
      formattedPrice: "₾2,400",
      productImageUrl: "https://example.com/sofa.jpg",
      locale: "en",
    });
    const imgs = flatten(tree).filter((el) => el.type === "img");
    expect(imgs.length).toBe(1);
  });

  it("ka locale renders product name with the Georgian font family", () => {
    const tree = buildProductTemplate({
      productName: "სამადგილიანი დივანი",
      formattedPrice: "2 400 ₾",
      locale: "ka",
    });
    expect(treeReferencesFont(tree, OG_FONT_FAMILY.georgianSerif)).toBe(true);
  });
});

describe("buildCategoryTemplate", () => {
  it("renders the category name as the title", () => {
    const tree = buildCategoryTemplate({
      categoryName: "Sofas",
      locale: "en",
    });
    const titles = flatten(tree).map((el) => firstText(el.props?.children));
    expect(titles).toContain("Sofas");
  });

  it("does not throw when intro and product count are omitted", () => {
    expect(() =>
      buildCategoryTemplate({ categoryName: "Sofas", locale: "en" })
    ).not.toThrow();
  });
});

describe("buildErrorTemplate", () => {
  it("defaults the error code to 404", () => {
    const tree = buildErrorTemplate({
      message: "Page not found",
      locale: "en",
    });
    const titles = flatten(tree).map((el) => firstText(el.props?.children));
    expect(titles).toContain("404");
  });

  it("can be customised with a different code", () => {
    const tree = buildErrorTemplate({
      errorCode: "410",
      message: "Gone",
      locale: "en",
    });
    const titles = flatten(tree).map((el) => firstText(el.props?.children));
    expect(titles).toContain("410");
  });
});

describe("shortenIntro", () => {
  it("returns the original string when it is already short enough", () => {
    expect(shortenIntro("short", 80)).toBe("short");
  });

  it("trims at a word boundary and appends a horizontal ellipsis", () => {
    const long =
      "This is a long category intro paragraph that goes on and on with several clauses.";
    const out = shortenIntro(long, 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    // The prefix (sans the ellipsis) must end on a complete word —
    // i.e. the next character in the original input is a space (not a
    // mid-word slice).
    const prefix = out.slice(0, -1);
    const idx = long.indexOf(prefix);
    expect(idx).toBe(0);
    const nextChar = long.charAt(prefix.length);
    expect(nextChar === "" || /\s/.test(nextChar)).toBe(true);
  });
});
