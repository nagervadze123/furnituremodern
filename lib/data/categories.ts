// Category data access. Same pattern as `products.ts`: every consumer
// goes through these functions, never the raw `lib/site-config.ts`
// `categories` array.
//
// Phase 5 Task 3 — categories are now FULLY Supabase-driven.
//
//   • `getCategories()` returns active rows (is_deleted = false) sorted
//     by sort_order then created_at — operator can add a category in
//     /admin/categories and it appears on the public site without a
//     code change.
//   • `getFeaturedNavCategories()` is the top-nav subset (max 5 enforced
//     by the admin form).
//   • `getCategoryBySlug(slug)` returns a single active row or null;
//     the route maps null → 404.
//
// The local TS array in `lib/site-config.ts` is offline-fallback ONLY:
// returned when `isSupabaseConfigured()` is false (CI without an env
// file, dev mode without a Supabase project). Production with Supabase
// configured NEVER substitutes that array on a query failure — it
// returns an empty list and lets the page render a controlled empty
// state (same pattern as `products.ts`).
//
// All three public helpers are wrapped with React's `cache()` so that
// multiple components on the same render pass share a single fetch.

import "server-only";

import { cache } from "react";

import type { Locale } from "@/i18n/routing";
import { categories as localCategories } from "@/lib/site-config";
import type { DataCategory } from "./types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { logError } from "@/lib/observability";

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
    intro: { ka: c.ka.intro, en: c.en.intro },
    sortOrder: index,
    isFeaturedInNav: true,
  };
}

type SupabaseCategoryRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  intro_ka: string;
  intro_en: string;
  sort_order: number;
  is_featured_in_nav: boolean;
  image_url: string | null;
};

function mapSupabase(row: SupabaseCategoryRow): DataCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: { ka: row.name_ka, en: row.name_en },
    description: { ka: row.description_ka, en: row.description_en },
    intro: { ka: row.intro_ka, en: row.intro_en },
    sortOrder: row.sort_order,
    isFeaturedInNav: row.is_featured_in_nav,
    imageUrl: row.image_url,
  };
}

const SELECT_COLS =
  "id, slug, name_ka, name_en, description_ka, description_en, intro_ka, intro_en, sort_order, is_featured_in_nav, image_url";

// ---------------------------------------------------------------------------
// Public query functions
// ---------------------------------------------------------------------------

/**
 * List active (non-soft-deleted) categories in display order.
 *
 * @param locale - Reserved for locale-aware ordering or filtering.
 *
 * Memoized via React `cache()` for request-scope deduplication: on a
 * single render pass the header, footer, sitemap, and 404 fallback can
 * all call this without triggering separate Supabase round-trips.
 */
export const getCategories = cache(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_locale?: Locale): Promise<DataCategory[]> => {
    if (isSupabaseConfigured()) {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("categories")
        .select(SELECT_COLS)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error && data) {
        return (data as SupabaseCategoryRow[]).map(mapSupabase);
      }
      if (error) {
        logError(error, {
          route: "lib/data/categories:getCategories",
          scope: "route",
        });
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
);

/**
 * Subset of categories flagged for the top navigation. Capped at 5
 * regardless of how many rows match — the admin form enforces the
 * same cap, but defending here keeps an accidental DB write from
 * widening the nav unexpectedly.
 */
export const getFeaturedNavCategories = cache(
  async (locale?: Locale): Promise<DataCategory[]> => {
    const all = await getCategories(locale);
    return all.filter((c) => c.isFeaturedInNav).slice(0, 5);
  }
);

/**
 * Look up a single active category by slug. Returns null rather than
 * throwing so route handlers can map it to a 404. Soft-deleted rows
 * resolve to null too — the page returns 404 until the operator
 * restores the row.
 */
export const getCategoryBySlug = cache(
  async (
    slug: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _locale?: Locale
  ): Promise<DataCategory | null> => {
    if (isSupabaseConfigured()) {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("categories")
        .select(SELECT_COLS)
        .eq("is_deleted", false)
        .eq("slug", slug)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapSupabase(data[0] as SupabaseCategoryRow);
      }
      if (error) {
        logError(error, {
          route: "lib/data/categories:getCategoryBySlug",
          scope: "route",
        });
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
);

/**
 * Cheap async predicate: does an active category with this slug exist?
 *
 * Used at route entry points where we need to decide whether to render
 * the page or call `notFound()`. Internally a thin wrapper around
 * `getCategoryBySlug` so it shares the request-scope cache.
 */
export async function isCategorySlug(
  slug: string,
  locale?: Locale
): Promise<boolean> {
  const row = await getCategoryBySlug(slug, locale);
  return row !== null;
}
