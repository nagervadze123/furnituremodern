// Category data access. Same pattern as `products.ts`: every consumer
// goes through these functions, never the raw `lib/site-config.ts`
// `categories` array.
//
// • Supabase backed when `NEXT_PUBLIC_SUPABASE_URL` is set.
// • Local TS fallback otherwise (so offline builds keep working).
//
// IMPORTANT — categories are code-defined, not fully DB-defined.
// `isCategorySlug` rejects any slug that is not enumerated in
// `lib/site-config.ts`. The route tree, JSON-LD, sitemap, and
// editorial copy in `content/category-intros.ts` all depend on that
// fixed list. The admin schema (`lib/admin/schemas.ts`) blocks
// creating Supabase rows with unsupported slugs so this filter is a
// belt-and-braces safeguard rather than a silent loss path. To add a
// new category, ship the site-config + content change first, then
// create the row in the admin.

import "server-only";

import type { Locale } from "@/i18n/routing";
import {
  categories as localCategories,
  type CategorySlug,
} from "@/lib/site-config";
import type { DataCategory } from "./types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapLocal(
  c: (typeof localCategories)[number],
  index: number
): DataCategory {
  return {
    slug: c.slug,
    name: { ka: c.ka.name, en: c.en.name },
    description: { ka: c.ka.tagline, en: c.en.tagline },
    sortOrder: index,
  };
}

type SupabaseCategoryRow = {
  slug: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  sort_order: number;
};

function mapSupabase(row: SupabaseCategoryRow): DataCategory | null {
  if (!isCategorySlug(row.slug)) {
    // Should never happen now that the admin schema rejects unsupported
    // slugs; surface it loudly if a row slips through (e.g. inserted
    // directly into Postgres) so the maintainer notices instead of
    // wondering why the category page doesn't appear.
    console.warn(
      "[data/categories] dropping unsupported category slug %s — add it to lib/site-config.ts first",
      row.slug
    );
    return null;
  }
  return {
    slug: row.slug as CategorySlug,
    name: { ka: row.name_ka, en: row.name_en },
    description: { ka: row.description_ka, en: row.description_en },
    sortOrder: row.sort_order,
  };
}

// ---------------------------------------------------------------------------
// Public query functions
// ---------------------------------------------------------------------------

/**
 * List all categories in display order.
 *
 * @param locale - Reserved for locale-aware ordering or filtering.
 */
export async function getCategories(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _locale?: Locale
): Promise<DataCategory[]> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select(
        "slug, name_ka, name_en, description_ka, description_en, sort_order"
      )
      .order("sort_order", { ascending: true });

    if (!error && data) {
      return (data as SupabaseCategoryRow[])
        .map(mapSupabase)
        .filter((c): c is DataCategory => c !== null);
    }
    if (error) {
      console.error("[data/categories] Supabase query failed:", error.message);
    }
    // Production: do not silently substitute the local placeholder
    // category list on a DB error. Return empty so the page can render
    // a controlled empty state instead of misleading content.
    if (process.env.NODE_ENV === "production") return [];
    // Development/offline: fall through to the local fallback so devs
    // can keep working without Supabase.
  }

  return localCategories.map(mapLocal);
}

/**
 * Look up a single category by slug. Returns null rather than throwing
 * so route handlers can map it to a 404.
 */
export async function getCategoryBySlug(
  slug: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _locale?: Locale
): Promise<DataCategory | null> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select(
        "slug, name_ka, name_en, description_ka, description_en, sort_order"
      )
      .eq("slug", slug)
      .limit(1);

    if (!error && data && data.length > 0) {
      return mapSupabase(data[0] as SupabaseCategoryRow);
    }
    if (error) {
      console.error("[data/categories] Supabase lookup failed:", error.message);
    }
    // Production: don't substitute a local placeholder row on a DB
    // error or empty result — return null so the route renders a 404.
    if (process.env.NODE_ENV === "production") return null;
    // Development: fall through to the local catalog so offline work
    // keeps rendering.
  }

  const idx = localCategories.findIndex((c) => c.slug === slug);
  if (idx === -1) return null;
  return mapLocal(localCategories[idx]!, idx);
}

/** Type guard — narrows an unknown string to a valid CategorySlug. */
export function isCategorySlug(value: string): value is CategorySlug {
  return localCategories.some((c) => c.slug === value);
}
