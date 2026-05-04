// Element-tree tests for the redesigned ProductGrid. The component is
// an async server component that calls next-intl/server's
// getTranslations — we mock that here so the test runs without a
// request scope (vitest runs outside Next's middleware).

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    return (key: string) => {
      const map: Record<string, string> = {
        no_products: "No products in this category yet",
        browse_other_categories: "Browse other categories",
        browseOther: "Browse other categories",
      };
      return map[key] ?? key;
    };
  },
}));

// next-intl's navigation helpers reach into the request — stub the Link
// to a plain anchor for the unit test.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: unknown;
    className?: string;
  }) => ({
    type: "a",
    props: { href, className, children },
    key: null,
  }),
}));

import { ProductGrid } from "./ProductGrid";

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

describe("ProductGrid empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a localised empty-state message when products is []", async () => {
    const tree = (await ProductGrid({ products: [] })) as AnyElement;
    expect(flatText(tree)).toContain("No products in this category yet");
  });

  it("includes a link back to the category index in the empty state", async () => {
    const tree = (await ProductGrid({ products: [] })) as AnyElement;
    expect(flatText(tree)).toContain("Browse other categories");
  });
});
