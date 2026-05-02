// Shared body for every category page. The route files only need to
// supply the category slug and the localized intro paragraph — this
// component handles breadcrumbs, JSON-LD, the product grid, and the
// cross-links to other categories.

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "./breadcrumbs";
import { CategoryIntro } from "./category-intro";
import { ProductGrid } from "./product-grid";
import { CategoryCrossLinks } from "./category-cross-links";
import { JsonLd } from "@/components/json-ld";
import { ViewItemListTracker } from "@/components/analytics/view-item-list-tracker";
import { AeoSummaryPanel } from "@/components/sections/aeo-summary";
import {
  breadcrumbListJsonLd,
  itemListJsonLd,
  collectionPageJsonLd,
} from "@/lib/schema";
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
};

export async function CategoryPage({ slug, locale, intro }: Props) {
  const tBreadcrumbs = await getTranslations("breadcrumbs");

  // Both lookups go through the data layer so the source can swap
  // (Supabase ↔ local TS) without touching this component.
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug, locale),
    getProducts({ category: slug, locale }),
  ]);
  if (!category) notFound();

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
        data={itemListJsonLd(slug, locale, products)}
        nonce={nonce}
      />

      {/* Breadcrumb strip — visible navigation, separate from the JSON-LD. */}
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <CategoryIntro title={category.name[locale]} intro={intro} />
      <ProductGrid products={products} listName={category.name[locale]} />

      {/* Compact AEO summary block — visible factual snapshot for
          AI crawlers, identical to what humans see. */}
      <AeoSummaryPanel
        summary={categoryAeoSummary(slug, locale, products.length)}
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
