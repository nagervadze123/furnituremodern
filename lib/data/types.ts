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

/** schema.org availability values we expose to the catalog. */
export type ProductAvailability =
  | "InStock"
  | "OutOfStock"
  | "PreOrder"
  | "BackOrder";

/** schema.org item condition values we expose to the catalog. */
export type ProductCondition =
  | "NewCondition"
  | "UsedCondition"
  | "RefurbishedCondition";

/**
 * Physical dimensions for one axis. unitCode follows the UN/CEFACT
 * common-codes used by schema.org QuantitativeValue — "CMT" for
 * centimetres, "MTR" for metres.
 */
export type DimensionsValue = {
  width?: number;
  height?: number;
  depth?: number;
  unitCode?: "CMT" | "MTR";
};

export type WeightValue = {
  value: number;
  /** "KGM" for kilograms, "GRM" for grams. */
  unitCode?: "KGM" | "GRM";
};

/**
 * A product as the marketing site sees it — already filtered to
 * published rows, already typed and bilingual.
 *
 * Optional ecommerce fields below (sku, mpn, color, material,
 * dimensions, weight, availability, condition, brand) feed Product
 * JSON-LD on the detail page. None are mandatory: fields that are
 * undefined are simply omitted from the schema output, so existing
 * catalog rows keep working without backfill.
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

  // ---- Ecommerce / structured-data fields (all optional) ----
  sku?: string;
  mpn?: string;
  color?: string;
  material?: string;
  dimensions?: DimensionsValue;
  weight?: WeightValue;
  availability?: ProductAvailability;
  condition?: ProductCondition;
  /** Per-product brand override; falls back to siteConfig.name. */
  brand?: string;

  // ---- Freshness signals (Supabase-backed only; undefined locally) ----
  /** ISO timestamp from products.updated_at. */
  updatedAt?: string;
  /** ISO timestamp from products.created_at. */
  createdAt?: string;
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
