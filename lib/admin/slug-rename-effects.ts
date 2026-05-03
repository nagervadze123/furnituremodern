// Side effects of a product slug rename, extracted from the admin
// product update action so they can be unit-tested.
//
// Strategy: fail-and-surface (rollback would require a Postgres
// transaction, which Supabase's PostgREST client cannot orchestrate
// across multiple statements). The product row is committed first;
// each side effect below runs after that and, on failure, returns an
// explicit error string. The caller is expected to surface that string
// to the admin UI as `ok: false` so the operator sees a red banner
// instead of a green "Saved." — and re-saving is idempotent because
//   • product_slug_history insert: the action only invokes us when
//     `next.slug !== prev.slug`, and the action runs against the new
//     persisted slug, so a retry hits the same `(product_id, old_slug)`
//     pair (append-only by design — duplicate rows are tolerable);
//   • redirects upsert: keyed on `from_path`, so re-running re-applies
//     the same `to_path` without conflict.
//
// Every failure is also forwarded to logError() so observability picks
// it up. No PII is logged: route + slug-old + slug-new + Postgres
// error code is the maximum surface area.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/observability";

export type SlugSideEffectResult =
  | { ok: true }
  | { ok: false; message: string };

export async function recordSlugChange(opts: {
  supabase: SupabaseClient;
  productId: string;
  changedBy: string;
  oldSlug: string;
}): Promise<SlugSideEffectResult> {
  const { supabase, productId, changedBy, oldSlug } = opts;
  const { error } = await supabase
    .from("product_slug_history")
    .insert({
      product_id: productId,
      old_slug: oldSlug,
      changed_by: changedBy,
    });
  if (!error) return { ok: true };

  logError(error, {
    route: "admin/products/actions:recordSlugChange",
    scope: "route",
    tags: { product_id: productId, old_slug: oldSlug, code: error.code ?? "" },
  });
  return {
    ok: false,
    message: `Product saved, but recording the slug history failed: ${error.message}. Re-save to retry, or fix the redirect/history rows manually.`,
  };
}

export async function writeSlugRedirects(opts: {
  supabase: SupabaseClient;
  oldCategorySlug: string;
  oldSlug: string;
  newCategorySlug: string;
  newSlug: string;
}): Promise<SlugSideEffectResult> {
  const { supabase, oldCategorySlug, oldSlug, newCategorySlug, newSlug } =
    opts;
  const locales = ["ka", "en"] as const;
  const rows = locales.map((loc) => ({
    from_path: `/${loc}/${oldCategorySlug}/${oldSlug}`,
    to_path: `/${loc}/${newCategorySlug}/${newSlug}`,
    status_code: 301,
  }));
  const { error } = await supabase
    .from("redirects")
    .upsert(rows, { onConflict: "from_path", ignoreDuplicates: false });
  if (!error) return { ok: true };

  logError(error, {
    route: "admin/products/actions:writeSlugRedirects",
    scope: "route",
    tags: {
      old_path: `/${oldCategorySlug}/${oldSlug}`,
      new_path: `/${newCategorySlug}/${newSlug}`,
      code: error.code ?? "",
    },
  });
  return {
    ok: false,
    message: `Product saved, but creating the redirect from the old URL failed: ${error.message}. Re-save to retry, or add the redirect manually.`,
  };
}
