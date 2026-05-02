// /llms-full.txt — rich machine-readable index of every public
// category + every published product + the FAQ.
//
// Intended for ChatGPT/Perplexity/Google AI Overviews to extract
// factual answers without scraping HTML. Format is plain text with
// `# ქართული` then `# English` so Georgian-first localization is
// preserved.
//
// Cache + revalidation behave the same as /llms.txt.

import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { buildLlmsFull, freshnessTimestamp } from "@/lib/aeo/llms";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [cats, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const lastRegenerated = freshnessTimestamp(products);
  const body = buildLlmsFull({ cats, products, lastRegenerated });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
