// Element-tree tests for the Phase 5b FeaturedCollection editorial
// moment. The section is operator-controlled — it returns null
// entirely when `siteConfig.brand.featuredProductSlug` is unset, and
// renders a heading + image + body + CTA when a slug + product exist.
//
// We mock the data layer (getProductBySlug), the i18n helpers, and
// the locale-aware Link export. siteConfig.brand.featuredProductSlug
// is mutated per-test via a small helper because the brandTokens
// object is `as const` — we cast away readonly for the test scope only.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";

// next-intl's `t` is a callable function with a `.rich` property
// for rich-text rendering. Mock both so components using either
// `t(key)` or `t.rich(key, { em: chunks => <em>{chunks}</em> })`
// work in vitest. The rich variant returns the same namespaced
// fallback string — element-tree assertions on the rendered tree
// can read the literal key.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    const t = (key: string) => `${namespace ?? "fallback"}.${key}`;
    (t as unknown as { rich: (key: string) => string }).rich = (
      key: string
    ) => `${namespace ?? "fallback"}.${key}`;
    return t;
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

const getProductBySlugMock = vi.fn();
vi.mock("@/lib/data/products", () => ({
  getProductBySlug: (...args: unknown[]) => getProductBySlugMock(...args),
}));

import { FeaturedCollection } from "./FeaturedCollection";
import { siteConfig } from "@/lib/site-config";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  src?: string;
  id?: string;
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

// `siteConfig.brand` is `as const`, so its featuredProductSlug field
// is typed as readonly null. We mutate it via a casting helper purely
// for the test scope; restored in beforeEach.
type WritableBrand = {
  featuredProductSlug: string | null;
};

function setFeaturedSlug(slug: string | null) {
  (siteConfig.brand as unknown as WritableBrand).featuredProductSlug = slug;
}

describe("FeaturedCollection", () => {
  beforeEach(() => {
    getProductBySlugMock.mockReset();
    setFeaturedSlug(null);
  });

  it("returns null when featuredProductSlug is unset (omits the section entirely)", async () => {
    setFeaturedSlug(null);
    const result = await FeaturedCollection();
    expect(result).toBeNull();
    // The data layer must not be called when the section is skipped.
    expect(getProductBySlugMock).not.toHaveBeenCalled();
  });

  it("returns null when the slug is set but the product cannot be resolved", async () => {
    setFeaturedSlug("missing-product");
    getProductBySlugMock.mockResolvedValueOnce(null);
    const result = await FeaturedCollection();
    expect(result).toBeNull();
  });

  it("renders the section when both slug and product are present", async () => {
    setFeaturedSlug("walnut-frame-loveseat");
    getProductBySlugMock.mockResolvedValueOnce({
      id: "p1",
      slug: "walnut-frame-loveseat",
      category: "sofas",
      name: { ka: "ვალნუტი", en: "Walnut" },
      description: { ka: "x", en: "x" },
      price: 4200,
      currency: "GEL",
      images: [
        {
          url: "https://example.com/walnut.jpg",
          alt: { ka: "alt-ka", en: "alt-en" },
          width: 1200,
          height: 900,
        },
      ],
    });

    const tree = (await FeaturedCollection()) as AnyElement;
    expect(tree).not.toBeNull();

    // The CTA link goes through the locale-aware <Link> mock (type =
    // function reference) — match on the `href` prop directly so we
    // catch both mocked Link and plain <a> children.
    const anchors = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.href === "string";
    });
    const hrefs = anchors.map((a) => (a.props as { href?: string }).href);
    expect(hrefs).toContain("/sofas/walnut-frame-loveseat");
  });

  // Phase B Slice 4 — terracotta-500 contrast sweep. The "View" CTA
  // hover/focus colour was terracotta-500 (4.25:1 on bone-50, fails
  // AA at body size); per docs/design/contrast.md the canonical
  // body-size accent is terracotta-600 (5.80:1, AA-clear). Token-
  // anchored to the CSS variable name so a future Tailwind class
  // refactor can't drift past the assertion silently.
  it("paints the CTA link's hover/focus in terracotta-600, not terracotta-500", async () => {
    setFeaturedSlug("walnut-frame-loveseat");
    getProductBySlugMock.mockResolvedValueOnce({
      id: "p1",
      slug: "walnut-frame-loveseat",
      category: "sofas",
      name: { ka: "ვალნუტი", en: "Walnut" },
      description: { ka: "x", en: "x" },
      price: 4200,
      currency: "GEL",
      images: [
        {
          url: "https://example.com/walnut.jpg",
          alt: { ka: "alt-ka", en: "alt-en" },
          width: 1200,
          height: 900,
        },
      ],
    });

    const tree = (await FeaturedCollection()) as AnyElement;
    const cta = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return props.href === "/sofas/walnut-frame-loveseat";
    })[0];
    expect(cta).toBeTruthy();
    const cn = ((cta!.props as Record<string, unknown>).className ??
      "") as string;
    expect(cn).toContain("hover:text-[var(--color-terracotta-600)]");
    expect(cn).toContain("focus-visible:text-[var(--color-terracotta-600)]");
    expect(cn).not.toContain("text-[var(--color-terracotta-500)]");
  });
});
