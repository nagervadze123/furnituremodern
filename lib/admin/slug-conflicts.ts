// Centralized slug-conflict detection for admin product mutations.
//
// Two checks, both run server-side via the admin Supabase client:
//   1. No other non-deleted product already owns this slug.
//      (Editing the same product is fine; pass excludeProductId.)
//   2. No redirects.from_path collides with the new public path,
//      because that would 301-loop or shadow a real product.
//
// Errors return a code and a Georgian-language message so the form can
// show them inline. English callers can map the code.
//
// Preconditions:
//   - `slug` MUST already satisfy isValidSlug() — the helper does NOT
//     re-validate. Callers should run it through productSchema/Zod first.
//
// Known corner: renaming a product `a → b → a` will hit redirect_conflict
// on the revert because the `a → b` rename inserted /<loc>/<cat>/a as a
// redirect's from_path. The redirect points back at this same product,
// so it's stale, not truly conflicting — admin must delete that
// redirect from /admin/seo before reverting. Plan 2's SEO dashboard
// surfaces orphan/stale redirects; for now this helper treats it as a
// hard conflict to prevent silent 301 loops.
//
// Strings live inline today because there are only two; if more land,
// route through messages/ka.json keyed by `code`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Conflict =
  | { ok: true }
  | { ok: false; code: "slug_in_use"; message_ka: string }
  | { ok: false; code: "redirect_conflict"; message_ka: string };

type Args = {
  supabase: SupabaseClient<Database>;
  slug: string;
  categorySlug: string;
  excludeProductId: string | null;
};

const LOCALES = ["ka", "en"] as const;

export async function detectSlugConflicts({
  supabase,
  slug,
  categorySlug,
  excludeProductId,
}: Args): Promise<Conflict> {
  const productQuery = supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null);

  const productScoped = excludeProductId
    ? productQuery.neq("id", excludeProductId)
    : productQuery;

  const { data: productMatch } = await productScoped.limit(1).maybeSingle();
  if (productMatch) {
    return {
      ok: false,
      code: "slug_in_use",
      message_ka: "ეს სლაგი სხვა პროდუქტს უკვე აქვს",
    };
  }

  const candidates = LOCALES.map((loc) => `/${loc}/${categorySlug}/${slug}`);
  const { data: redirectMatch } = await supabase
    .from("redirects")
    .select("from_path")
    .in("from_path", candidates)
    .limit(1)
    .maybeSingle();

  if (redirectMatch) {
    return {
      ok: false,
      code: "redirect_conflict",
      message_ka: "ამ სლაგზე უკვე არსებობს გადამისამართება",
    };
  }

  return { ok: true };
}
