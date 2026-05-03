// Product data access. Every page/component that needs product data
// goes through this module — never `content/products.ts` directly.
//
// Today the data flow is conditional:
//   • If `NEXT_PUBLIC_SUPABASE_URL` is set, we query Supabase.
//   • Otherwise we fall back to the local TS catalog at
//     `content/products.ts`. This keeps `npm run build` and offline
//     development working without a Supabase project attached.

import "server-only";

import type { Locale } from "@/i18n/routing";
import type { CategorySlug } from "@/lib/site-config";
import { isCategorySlug } from "./categories";
import type {
  DataProduct,
  DataProductImage,
  GetProductsOptions,
} from "./types";
import {
  getAllProducts as localAll,
  getProductsByCategory as localByCategory,
  getProductBySlug as localBySlug,
  type Product as LocalProduct,
} from "@/content/products";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { logError } from "@/lib/observability";

// ---------------------------------------------------------------------------
// Local-fallback mappers
// ---------------------------------------------------------------------------

function mapLocal(p: LocalProduct): DataProduct {
  return {
    id: p.id,
    slug: p.slug,
    category: p.category,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    images: p.images.map(
      (img): DataProductImage => ({
        url: img.url,
        alt: img.alt,
        width: img.width,
        height: img.height,
      })
    ),
    isFeatured: false,
  };
}

// ---------------------------------------------------------------------------
// Supabase-backed mappers
// ---------------------------------------------------------------------------

/**
 * Shape of a row joined from `products + categories + product_images`.
 * Defined inline (not imported from a generated types module) so this
 * file stays compatible with projects that have not generated types yet.
 */
type SupabaseProductRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  price: number | string;
  currency: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  updated_at: string | null;
  created_at: string | null;
  categories: { slug: string } | null;
  product_images: Array<{
    storage_path: string;
    alt_ka: string;
    alt_en: string;
    sort_order: number;
    is_primary: boolean;
  }>;
};

/**
 * Convert a `storage_path` into a publicly accessible URL.
 * The seed file stores fully-qualified `https://...` URLs as the path
 * for placeholder data; we detect those and return them unchanged.
 * Real storage paths are resolved via Supabase Storage's public URL.
 */
function resolveImageUrl(
  path: string,
  publicUrlBase: string
): string {
  if (/^https?:\/\//i.test(path)) return path;
  // Strip leading slashes so we don't end up with double-slashes.
  const clean = path.replace(/^\/+/, "");
  return `${publicUrlBase}/${clean}`;
}

function mapSupabase(
  row: SupabaseProductRow,
  publicUrlBase: string
): DataProduct | null {
  // Defensive: if the join lost the category, drop the row rather than
  // returning a product with an unknown category slug.
  const slug = row.categories?.slug;
  if (!slug || !isCategorySlug(slug)) return null;

  // Sort images: primary first, then by sort_order ascending.
  const images = [...row.product_images]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order;
    })
    .map(
      (img): DataProductImage => ({
        url: resolveImageUrl(img.storage_path, publicUrlBase),
        alt: { ka: img.alt_ka, en: img.alt_en },
        width: 1200,
        height: 900,
      })
    );

  return {
    id: row.id,
    slug: row.slug,
    category: slug as CategorySlug,
    name: { ka: row.name_ka, en: row.name_en },
    description: { ka: row.description_ka, en: row.description_en },
    // Postgres numeric comes through as string; coerce defensively.
    price: typeof row.price === "string" ? Number(row.price) : row.price,
    currency: (row.currency as DataProduct["currency"]) ?? "GEL",
    images,
    isFeatured: row.is_featured,
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

/**
 * Build the public-URL base for the `product-images` storage bucket.
 * We construct it manually rather than calling `getPublicUrl` per row
 * to avoid 18+ extra round trips — Supabase exposes a stable URL
 * pattern.
 */
function getStoragePublicUrlBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/product-images`;
}

// ---------------------------------------------------------------------------
// Public query functions
// ---------------------------------------------------------------------------

/**
 * List products with optional filtering and pagination.
 *
 * @example
 *   const sofas = await getProducts({ category: "sofas", limit: 12 });
 */
export async function getProducts(
  options: GetProductsOptions = {}
): Promise<DataProduct[]> {
  const { category, limit, offset = 0, featuredOnly } = options;

  if (isSupabaseConfigured()) {
    const supabase = createSupabasePublicClient();
    let query = supabase
      .from("products")
      .select(
        // Explicit columns + nested categories slug + nested images.
        `id, slug, name_ka, name_en, description_ka, description_en,
         price, currency, is_featured, is_published, sort_order,
         updated_at, created_at,
         categories!inner ( slug ),
         product_images ( storage_path, alt_ka, alt_en, sort_order, is_primary )`
      )
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (category) query = query.eq("categories.slug", category);
    if (featuredOnly) query = query.eq("is_featured", true);
    if (typeof limit === "number") {
      query = query.range(offset, offset + limit - 1);
    } else if (offset > 0) {
      query = query.range(offset, offset + 10000);
    }

    const { data, error } = await query;
    if (error) {
      logError(error, {
        route: "lib/data/products:getProducts",
        scope: "route",
      });
      // In production with Supabase configured, never silently serve
      // local placeholder data — that would show wrong prices/URLs to
      // real users and search engines. Return an empty list instead.
      // In development we fall through to the local catalog so devs
      // can keep working through transient DB outages.
      if (process.env.NODE_ENV === "production") return [];
      return localFallbackList(options);
    }

    const base = getStoragePublicUrlBase();
    return (data as unknown as SupabaseProductRow[])
      .map((row) => mapSupabase(row, base))
      .filter((p): p is DataProduct => p !== null);
  }

  return localFallbackList(options);
}

function localFallbackList(options: GetProductsOptions): DataProduct[] {
  const { category, limit, offset = 0, featuredOnly } = options;
  let rows = (category ? localByCategory(category) : localAll()).map(mapLocal);
  if (featuredOnly) rows = rows.filter((p) => p.isFeatured);
  if (offset > 0) rows = rows.slice(offset);
  if (typeof limit === "number") rows = rows.slice(0, limit);
  return rows;
}

/**
 * Look up a single product by slug. Returns null on miss.
 *
 * The `category` argument is optional. Pass it when you have it for a
 * faster lookup; otherwise we scan all categories.
 */
export async function getProductBySlug(
  slug: string,
   
  _locale?: Locale,
  category?: CategorySlug
): Promise<DataProduct | null> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabasePublicClient();
    let query = supabase
      .from("products")
      .select(
        `id, slug, name_ka, name_en, description_ka, description_en,
         price, currency, is_featured, is_published, sort_order,
         updated_at, created_at,
         categories!inner ( slug ),
         product_images ( storage_path, alt_ka, alt_en, sort_order, is_primary )`
      )
      .eq("is_published", true)
      .is("deleted_at", null)
      .eq("slug", slug)
      .limit(1);

    if (category) query = query.eq("categories.slug", category);

    const { data, error } = await query;
    if (error) {
      logError(error, {
        route: "lib/data/products:getProductBySlug",
        scope: "route",
      });
      // Production: never substitute placeholder catalog data on a
      // query error — return null so the route renders 404 cleanly.
      // Development: fall through to local lookup so devs can keep
      // working through transient DB outages.
      if (process.env.NODE_ENV === "production") return null;
      return localFallbackBySlug(slug, category);
    }

    if (!data || data.length === 0) return null;

    const base = getStoragePublicUrlBase();
    return mapSupabase(
      (data[0] as unknown) as SupabaseProductRow,
      base
    );
  }

  return localFallbackBySlug(slug, category);
}

function localFallbackBySlug(
  slug: string,
  category?: CategorySlug
): DataProduct | null {
  if (category) {
    const found = localBySlug(category, slug);
    return found ? mapLocal(found) : null;
  }
  const all = localAll();
  const found = all.find((p) => p.slug === slug);
  return found ? mapLocal(found) : null;
}

/**
 * Featured products for the home page.
 *
 * @param locale - Reserved for future locale-aware ordering.
 */
export async function getFeaturedProducts(
  locale: Locale,
  limit = 6
): Promise<DataProduct[]> {
  // Try Supabase first via getProducts({ featuredOnly }).
  const featured = await getProducts({ featuredOnly: true, limit, locale });
  if (featured.length > 0) return featured;

  // No featured rows — fall back to "first N" so the home page still
  // shows something. This matches Phase 1 behavior where no row had
  // an explicit featured flag.
  return getProducts({ limit, locale });
}

/**
 * Enumerate every (category, slug) tuple for `generateStaticParams`.
 * Called at build time so it must work in BOTH paths.
 *
 * `updatedAt` is included for sitemap lastModified — undefined when
 * we're running against the local fallback catalog (no DB timestamps).
 */
export type ProductPath = {
  category: CategorySlug;
  slug: string;
  updatedAt?: string;
};

export async function getAllProductPaths(): Promise<ProductPath[]> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at, categories!inner ( slug )")
      .eq("is_published", true)
      .is("deleted_at", null);

    if (!error && data) {
      return (data as unknown as Array<{
        slug: string;
        updated_at: string | null;
        categories: { slug: string };
      }>)
        .filter((row) => isCategorySlug(row.categories.slug))
        .map((row) => ({
          category: row.categories.slug as CategorySlug,
          slug: row.slug,
          updatedAt: row.updated_at ?? undefined,
        }));
    }
    if (error) {
      logError(error, {
        route: "lib/data/products:getAllProductPaths",
        scope: "route",
      });
    }
    // Production: do not generate placeholder paths on DB error — that
    // would publish stale URLs in the sitemap. Empty list is safer.
    if (process.env.NODE_ENV === "production") return [];
  }
  return localAll().map((p) => ({ category: p.category, slug: p.slug }));
}
