// Element-tree regression guards for FeaturedCategories. Phase B
// Slice 4 — terracotta-500 contrast sweep introduced this file to
// lock the link hover/focus colour at terracotta-600 (5.80:1 on
// bone-50, AA-clear) and explicitly negate terracotta-500
// (4.25:1, fails AA at body size). Token-anchored — we assert the
// resolved CSS variable name in the className substring rather
// than a loose Tailwind utility, so a future class refactor can't
// drift past the rule silently.
//
// Vitest runs in node (no DOM, no getComputedStyle), so the most
// deterministic guard available is the literal arbitrary-value
// class that compiles to `color: var(--color-terracotta-600)`.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    return (key: string) => `${namespace ?? "fallback"}.${key}`;
  },
  getLocale: async () => "ka",
}));

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

vi.mock("@/lib/data/categories", () => ({
  getCategories: async () => [
    {
      slug: "sofas",
      name: { ka: "დივნები", en: "Sofas" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x intro", en: "x intro" },
      sortOrder: 0,
      isFeaturedInNav: true,
      imageUrl: null,
    },
    {
      slug: "bedrooms",
      name: { ka: "საძინებლები", en: "Bedrooms" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x intro", en: "x intro" },
      sortOrder: 1,
      isFeaturedInNav: true,
      imageUrl: null,
    },
    {
      slug: "tables-chairs",
      name: { ka: "მაგიდები", en: "Tables & chairs" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x intro", en: "x intro" },
      sortOrder: 2,
      isFeaturedInNav: true,
      imageUrl: null,
    },
  ],
}));

import { FeaturedCategories } from "./FeaturedCategories";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
}> & { type: unknown };

function findAll(
  node: unknown,
  predicate: (el: AnyElement) => boolean,
  out: AnyElement[] = []
): AnyElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  const el = node as AnyElement;
  if (predicate(el)) out.push(el);
  findAll((el.props as Record<string, unknown>)?.children, predicate, out);
  return out;
}

// FeaturedCategories renders a private `CategoryRow` function
// component for each row. The unrendered React element returned by
// `FeaturedCategories()` carries CategoryRow elements with their
// props but their bodies are never invoked by the test harness
// (vitest runs in node, no React renderer). To reach the inner
// `<Link>` className we manually invoke CategoryRow with its
// captured props. CategoryRow uses no hooks itself — it only
// constructs JSX referencing Reveal / AspectImage / Display / Body
// / Link primitives — so the call is safe outside a React scope.
function expandCategoryRows(tree: unknown): unknown[] {
  const rows = findAll(tree as AnyElement, (el) => {
    return (
      typeof el.type === "function" &&
      (el.type as { name?: string }).name === "CategoryRow"
    );
  });
  return rows.map((row) =>
    (row.type as (props: unknown) => unknown)(row.props)
  );
}

describe("FeaturedCategories", () => {
  it("paints each 'View category' link's hover/focus in terracotta-600, not terracotta-500", async () => {
    const tree = (await FeaturedCategories()) as AnyElement;
    expect(tree).not.toBeNull();

    const expandedRows = expandCategoryRows(tree);
    expect(expandedRows.length).toBeGreaterThan(0);

    // Three featured categories yield three category-row trees;
    // each contains the editorial CTA <Link>.
    const expectedHrefs = ["/sofas", "/bedrooms", "/tables-chairs"];
    const links: AnyElement[] = [];
    for (const rendered of expandedRows) {
      const found = findAll(rendered as AnyElement, (el) => {
        const href = (el.props as Record<string, unknown>).href;
        const cn = ((el.props as Record<string, unknown>).className ?? "") as string;
        // The category-row CTA carries `text-sm font-medium` on
        // the resting state — distinguishes it from the wrapping
        // image <Link>, which has the focus-visible ring class.
        return (
          typeof href === "string" &&
          expectedHrefs.includes(href as string) &&
          cn.includes("text-sm font-medium")
        );
      });
      links.push(...found);
    }
    expect(links).toHaveLength(expectedHrefs.length);

    for (const link of links) {
      const cn = ((link.props as Record<string, unknown>).className ??
        "") as string;
      expect(cn).toContain("hover:text-[var(--color-terracotta-600)]");
      expect(cn).toContain("focus-visible:text-[var(--color-terracotta-600)]");
      expect(cn).not.toContain("text-[var(--color-terracotta-500)]");
    }
  });

  // Belt-and-braces: across every category-row tree, confirm no
  // element paints terracotta-500 on text. The image-wrapping
  // <Link>'s `focus-visible:ring-[var(--color-terracotta-500)]` is
  // a permitted decorative ring (3:1 floor under SC 1.4.11) — the
  // negation below targets the `text-[...]` form specifically so
  // the focus ring stays untouched.
  it("never paints terracotta-500 on text anywhere in the section", async () => {
    const tree = (await FeaturedCategories()) as AnyElement;
    const expandedRows = expandCategoryRows(tree);
    for (const rendered of expandedRows) {
      const offenders = findAll(rendered as AnyElement, (el) => {
        const cn = ((el.props as Record<string, unknown>).className ??
          "") as string;
        return cn.includes("text-[var(--color-terracotta-500)]");
      });
      expect(offenders).toHaveLength(0);
    }
  });
});
