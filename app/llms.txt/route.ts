// /llms.txt — light index for LLM crawlers.
//
// Built dynamically from the data layer so adding a category in
// Supabase doesn't require a redeploy. Falls back cleanly to the
// local TS catalog when Supabase is unconfigured. Cached for an
// hour; admin save actions invalidate via revalidatePath.
//
// We picked a route handler over a static public/llms.txt because:
//   1. Categories are catalog data (Supabase-first); a static file
//      would drift behind admin edits.
//   2. Vercel's serverless runtime can't write to public/ at runtime,
//      so build-time static generation would force a redeploy after
//      every category rename.
//   3. Route handlers cost nothing extra — Next 16 supports
//      dot-bearing folder segments natively.

import { getCategories } from "@/lib/data/categories";
import { getAllProductPaths } from "@/lib/data/products";
import { buildLlmsIndex, freshnessTimestamp } from "@/lib/aeo/llms";
import type { DataProduct } from "@/lib/data/types";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [cats, productPaths] = await Promise.all([
    getCategories(),
    getAllProductPaths(),
  ]);
  // ProductPath only carries updated_at; that's enough for the
  // freshness timestamp helper.
  const lastRegenerated = freshnessTimestamp(
    productPaths.map(
      (p): DataProduct => ({
        id: "",
        slug: p.slug,
        category: p.category,
        name: { ka: "", en: "" },
        description: { ka: "", en: "" },
        price: 0,
        currency: "GEL",
        images: [],
        updatedAt: p.updatedAt,
      })
    )
  );

  const body = buildLlmsIndex({ cats, lastRegenerated });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
