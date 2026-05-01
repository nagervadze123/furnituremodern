// Shared shapes for the data layer.
//
// Use these types in pages and components. The implementations in
// `products.ts` and `categories.ts` may load from Supabase, from the
// in-memory TS catalog, or from a future CMS — but the call site stays
// the same.

import type { Locale } from "@/i18n/routing";
import type { CategorySlug } from "@/lib/site-config";

/** Localized text bundle: one string per supported locale. */
export type LocalizedText = { ka: string; en: string };

/** Single product image, with locale-specific alt text. */
export type DataProductImage = {
  url: string;
  alt: LocalizedText;
  width: number;
  height: number;
};

/**
 * A product as the marketing site sees it — already filtered to
 * published rows, already typed and bilingual.
 */
export type DataProduct = {
  id: string;
  slug: string;
  category: CategorySlug;
  name: LocalizedText;
  description: LocalizedText;
  /** Whole units, no fractional cents. e.g. 2400 means 2,400 GEL. */
  price: number;
  currency: "GEL";
  images: DataProductImage[];
  /** Used by getFeaturedProducts(). Defaults to false locally. */
  isFeatured?: boolean;
};

/**
 * A category as the marketing site sees it. Mirrors the columns the
 * Supabase `categories` table will eventually expose.
 */
export type DataCategory = {
  slug: CategorySlug;
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
};

/** Common pagination + filtering options for product queries. */
export type GetProductsOptions = {
  category?: CategorySlug;
  /**
   * Locale is currently advisory — products are always returned with
   * both languages so the same row can be reused for hreflang. Pass it
   * if you want a locale-aware sort order in the future.
   */
  locale?: Locale;
  limit?: number;
  offset?: number;
  /** Only return featured products. Used on the home page. */
  featuredOnly?: boolean;
};
