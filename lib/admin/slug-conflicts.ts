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
