// Side effects of a CATEGORY slug rename. Mirrors the product helper
// (`lib/admin/slug-rename-effects.ts`) so an audit row goes into
// `category_slug_history` and per-locale redirects land in `redirects`
// when an admin renames a category. Both side effects are idempotent
// — re-running the same upsert is a no-op.
//
// Strategy: fail-and-surface. The category row is committed first,
// each side effect runs after, and a failure returns an explicit
// message instead of trying to roll back (PostgREST can't orchestrate
// a transaction across statements). Re-saving is safe.
//
// Redirects cover BOTH the category landing page itself
// (`/{locale}/{old}` → `/{locale}/{new}`) AND every product detail
// path that lived under the old prefix (`/{locale}/{old}/{slug}` →
// `/{locale}/{new}/{slug}`). The wildcard is expressed as one row per
// known product slug — no regex support in the redirects table — so
// we accept the caller passing the affected product slugs.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/observability";

export type SlugSideEffectResult =
  | { ok: true }
  | { ok: false; message: string };

export async function recordCategorySlugChange(opts: {
  supabase: SupabaseClient;
  categoryId: string;
  changedBy: string;
  oldSlug: string;
}): Promise<SlugSideEffectResult> {
  const { supabase, categoryId, changedBy, oldSlug } = opts;
  const { error } = await supabase
    .from("category_slug_history")
    .insert({
      category_id: categoryId,
      old_slug: oldSlug,
      changed_by: changedBy,
    });
  if (!error) return { ok: true };

  logError(error, {
    route: "admin/categories/actions:recordCategorySlugChange",
    scope: "route",
    tags: {
      category_id: categoryId,
      old_slug: oldSlug,
      code: error.code ?? "",
    },
  });
  return {
    ok: false,
    message: `Category saved, but recording the slug history failed: ${error.message}. Re-save to retry, or fix the history row manually.`,
  };
}

export async function writeCategorySlugRedirects(opts: {
  supabase: SupabaseClient;
  oldSlug: string;
  newSlug: string;
  // Slugs of every product currently in this category, so the rename
  // can also cover their detail URLs. Pass [] when the category is
  // empty.
  productSlugs: string[];
}): Promise<SlugSideEffectResult> {
  const { supabase, oldSlug, newSlug, productSlugs } = opts;
  const locales = ["ka", "en"] as const;
  const rows: Array<{
    from_path: string;
    to_path: string;
    status_code: number;
  }> = [];
  for (const loc of locales) {
    rows.push({
      from_path: `/${loc}/${oldSlug}`,
      to_path: `/${loc}/${newSlug}`,
      status_code: 301,
    });
    for (const slug of productSlugs) {
      rows.push({
        from_path: `/${loc}/${oldSlug}/${slug}`,
        to_path: `/${loc}/${newSlug}/${slug}`,
        status_code: 301,
      });
    }
  }
  const { error } = await supabase
    .from("redirects")
    .upsert(rows, { onConflict: "from_path", ignoreDuplicates: false });
  if (!error) return { ok: true };

  logError(error, {
    route: "admin/categories/actions:writeCategorySlugRedirects",
    scope: "route",
    tags: {
      old_slug: oldSlug,
      new_slug: newSlug,
      product_count: String(productSlugs.length),
      code: error.code ?? "",
    },
  });
  return {
    ok: false,
    message: `Category saved, but creating the redirect from the old URL failed: ${error.message}. Re-save to retry, or add the redirects manually.`,
  };
}
