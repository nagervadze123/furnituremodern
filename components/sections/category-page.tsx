// Shared body for every category page. Phase 5 Task 5.x — redesigned to
// match the home page's editorial aesthetic.
//
//   • Editorial CategoryHero (display-2 headline, body-lg intro, optional
//     image at 60/40 split) replaces the old centred CategoryIntro.
//   • Premium ProductGrid (4/3/2 cols, reveal stagger on scroll, hover
//     lift) replaces the legacy 2-up grid.
//   • Optional sort bar — newest / price asc / price desc, driven by
//     the `?sort=` searchParam (resolved server-side, threaded through
//     the route handler).
//   • Empty state — when a category has no products, the new grid
//     renders a localised "no products yet" message + a link back home.
//
// JSON-LD blocks (BreadcrumbList, CollectionPage, ItemList) are
// preserved verbatim — same @ids so search engines see continuity.

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "./breadcrumbs";
import { CategoryHero } from "@/components/category/CategoryHero";
import { ProductGrid } from "@/components/category/ProductGrid";
import { SortBar } from "@/components/category/SortBar";
import { sortProducts, type SortKey } from "@/components/category/sort-keys";
import { CategoryCrossLinks } from "./category-cross-links";
import { JsonLd } from "@/components/json-ld";
import { ViewItemListTracker } from "@/components/analytics/view-item-list-tracker";
import { AeoSummaryPanel } from "@/components/sections/aeo-summary";
import {
  breadcrumbListJsonLd,
  itemListJsonLd,
  collectionPageJsonLd,
} from "@/lib/schema";
import { Container } from "@/components/design";
import type { CategorySlug } from "@/lib/site-config";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { productToItem } from "@/lib/analytics";
import {
  categoryAeoSummary,
  formatLastUpdated,
  LAST_UPDATED_LABEL,
} from "@/lib/aeo/summary";
import type { Locale } from "@/i18n/routing";

type Props = {
  slug: CategorySlug;
  locale: Locale;
  intro: string;
  /** Sort key from `?sort=` searchParam — undefined = default ordering. */
  sort?: SortKey;
};

/**
 * Resolve a category's hero image URL (operator-set image_url) into a
 * public URL. Mirrors the pattern in components/home/FeaturedCategories.tsx —
 * relative storage keys go through the Supabase product-images bucket;
 * absolute URLs pass through; nothing else is rendered as an image.
 */
function categoryHeroImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${imageUrl}`;
}

export async function CategoryPage({ slug, locale, intro, sort }: Props) {
  const [tBreadcrumbs, tCategory] = await Promise.all([
    getTranslations("breadcrumbs"),
    getTranslations("category"),
  ]);

  // Both lookups go through the data layer so the source can swap
  // (Supabase ↔ local TS) without touching this component.
  const [category, productsRaw] = await Promise.all([
    getCategoryBySlug(slug, locale),
    getProducts({ category: slug, locale }),
  ]);
  if (!category) notFound();

  // Apply user-selected sort. The data layer ships rows in the
  // operator's curated sort_order asc; sortProducts only re-orders when
  // the param requests something different.
  const products = sortProducts(productsRaw, sort);

  // Per-request CSP nonce, threaded into every inline <script> tag.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: category.name[locale] },
  ];

  // BreadcrumbList JSON-LD takes absolute paths; we mirror the
  // structure used by the visible breadcrumbs.
  const breadcrumbsForLd = [
    { name: tBreadcrumbs("home"), url: `/${locale}` },
    { name: category.name[locale], url: `/${locale}/${slug}` },
  ];

  const heroImage = categoryHeroImageUrl(category.imageUrl);

  return (
    <>
      <JsonLd
        id={`ld-breadcrumbs-${slug}`}
        data={breadcrumbListJsonLd(breadcrumbsForLd)}
        nonce={nonce}
      />
      <JsonLd
        id={`ld-collection-${slug}`}
        data={collectionPageJsonLd({
          locale,
          categorySlug: slug,
          name: category.name[locale],
          description: category.description[locale],
          numberOfItems: products.length,
        })}
        nonce={nonce}
      />
      <JsonLd
        id={`ld-itemlist-${slug}`}
        data={itemListJsonLd({
          categorySlug: slug,
          locale,
          name: category.name[locale],
          description: category.description[locale],
          products,
        })}
        nonce={nonce}
      />

      {/* Breadcrumb strip — matches the wide editorial container so the
          trail aligns with the rest of the page below. */}
      <Container variant="wide" className="pt-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </Container>

      <CategoryHero
        name={category.name[locale]}
        intro={intro}
        imageUrl={heroImage}
        imageAlt={category.name[locale]}
        eyebrow={tCategory("eyebrow")}
      />

      {/* Sort bar — only shown when the grid has at least 2 products
          (sorting one product is meaningless). The bar sits in the
          wide container so it visually anchors above the grid. */}
      {products.length > 1 ? (
        <Container variant="wide" className="pb-4">
          <SortBar current={sort ?? "newest"} />
        </Container>
      ) : null}

      <ProductGrid products={products} listName={category.name[locale]} />

      {/* Compact AEO summary block — visible factual snapshot for
          AI crawlers, identical to what humans see. */}
      <AeoSummaryPanel
        summary={categoryAeoSummary(category.name[locale], locale, products.length)}
        id={`aeo-${slug}`}
      />

      {/* Last-updated freshness signal. We use the latest product
          updatedAt within this category as the most truthful answer
          to "when did this page change." */}
      {(() => {
        const ts = products
          .map((p) => p.updatedAt ?? p.createdAt)
          .filter((d): d is string => typeof d === "string" && d.length > 0)
          .sort()
          .pop();
        if (!ts) return null;
        const formatted = formatLastUpdated(ts, locale);
        if (!formatted) return null;
        return (
          <p className="mx-auto max-w-3xl px-4 pb-4 text-sm text-muted-foreground md:px-6">
            {LAST_UPDATED_LABEL[locale]}:{" "}
            <time dateTime={ts}>{formatted}</time>
          </p>
        );
      })()}

      <CategoryCrossLinks currentSlug={slug} />

      <ViewItemListTracker
        list_name={category.name[locale]}
        items={products.map((p) => productToItem(p, locale))}
      />
    </>
  );
}
