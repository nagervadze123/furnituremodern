// Category data access. Same pattern as `products.ts`: every consumer
// goes through these functions, never the raw `lib/site-config.ts`
// `categories` array.
//
// • Supabase backed when `NEXT_PUBLIC_SUPABASE_URL` is set.
// • Local TS fallback otherwise (so offline builds keep working).

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
  if (!isCategorySlug(row.slug)) return null;
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
    // Fall through to local fallback so the page renders.
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
  }

  const idx = localCategories.findIndex((c) => c.slug === slug);
  if (idx === -1) return null;
  return mapLocal(localCategories[idx]!, idx);
}

/** Type guard — narrows an unknown string to a valid CategorySlug. */
export function isCategorySlug(value: string): value is CategorySlug {
  return localCategories.some((c) => c.slug === value);
}
