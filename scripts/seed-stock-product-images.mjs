#!/usr/bin/env node
// Replace picsum-based product_images rows with curated stock photos.
// Phase 5 Task 4.
//
// What it does:
//   1. Loads scripts/stock-photos.json (curated manifest with attribution).
//   2. Loads every published, non-deleted product from Supabase along
//      with its category slug.
//   3. Drops every existing product_images row whose storage_path points
//      at picsum.photos (the placeholder host that's being retired).
//   4. For each product, picks 3–5 deterministic stock photos from the
//      manifest's `intended_use === "product"` pool that match the
//      product's category. The first picked image is `is_primary = true`.
//   5. Inserts rows with storage_path = `stock/<filename>` (relative key
//      inside the product-images bucket — the data layer expands it to
//      a public URL via the bucket's public base). Attribution columns
//      are populated so the admin UI can flag stock placeholders.
//
// Re-runnable: a second run wipes any rows pointing at `stock/` paths
// and re-creates them, so adjusting the manifest and re-seeding is safe.
//
// Requires .env.local (or process env) to provide:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Usage:
//   node --env-file=.env.local scripts/seed-stock-product-images.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts", "stock-photos.json");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run with: node --env-file=.env.local scripts/seed-stock-product-images.mjs"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mapping from a Supabase category slug to the manifest categories that
// can supply photos for it. Lifestyle shots are pooled across all three
// product categories so every product has a few wider context shots in
// addition to single-piece studio frames.
const CATEGORY_SOURCES = {
  sofas: ["sofas", "lifestyle"],
  bedrooms: ["bedrooms", "lifestyle"],
  "tables-chairs": ["tables-chairs", "lifestyle"],
};

// Per-product image count. 3 keeps the gallery substantial without
// repeating obviously when the manifest is small; 5 looks lush when
// there are plenty of photos to spread around.
function targetImageCount(poolSize) {
  if (poolSize >= 30) return 5;
  if (poolSize >= 15) return 4;
  return 3;
}

// Deterministic offset so two adjacent products in the same category
// don't share the same first photo. Hashes the product slug into the
// pool index space.
function hashSlugToOffset(slug, mod) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % mod;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const photos = Array.isArray(manifest.photos) ? manifest.photos : [];

  if (photos.length === 0) {
    console.error(
      "[seed-stock-product-images] manifest has no photos — aborting. " +
        "Curate scripts/stock-photos.json first, then re-run."
    );
    process.exit(1);
  }

  // Bucket photos by manifest category. Keep insertion order stable so
  // the deterministic picker is reproducible across runs.
  const byCategory = new Map();
  for (const p of photos) {
    if (!p.filename || p.intended_use !== "product") continue;
    const arr = byCategory.get(p.category) ?? [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }

  console.log(
    `[seed-stock-product-images] loaded ${photos.length} manifest entries ` +
      `across ${byCategory.size} categories`
  );

  // Fetch products + their category slugs.
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, name_en, category_id, categories(slug)")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (prodErr) throw prodErr;

  console.log(`  → ${products.length} products to seed`);

  // 1. Wipe every legacy picsum row + every previous stock row so
  //    re-runs end with exactly the current manifest's mapping. We
  //    intentionally do NOT touch rows uploaded via the admin (those
  //    have storage_path values like "products/<uuid>/<file>.jpg" and
  //    are real operator content).
  const { error: delErr } = await supabase
    .from("product_images")
    .delete()
    .or("storage_path.like.https://picsum.photos/%,storage_path.like.stock/%");
  if (delErr) throw delErr;
  console.log("  → cleared legacy picsum + previous stock rows");

  // 2. Build the new rows.
  const rows = [];
  const productSummaries = [];
  for (const product of products) {
    const catSlug = product.categories?.slug;
    if (!catSlug) {
      console.warn(`  ! ${product.slug}: missing category, skipping`);
      continue;
    }
    const sourceCats = CATEGORY_SOURCES[catSlug] ?? [catSlug];
    // Concatenate pool deterministically across the source categories.
    const pool = sourceCats.flatMap((c) => byCategory.get(c) ?? []);
    if (pool.length === 0) {
      console.warn(
        `  ! ${product.slug}: no manifest photos for category "${catSlug}" or its lifestyle pool, skipping`
      );
      continue;
    }
    const want = targetImageCount(pool.length);
    const start = hashSlugToOffset(product.slug, pool.length);
    const picks = [];
    for (let i = 0; i < want; i++) {
      picks.push(pool[(start + i) % pool.length]);
    }
    picks.forEach((p, idx) => {
      rows.push({
        product_id: product.id,
        storage_path: `stock/${p.filename}`,
        alt_ka: product.name_en, // rough KA fallback — admin can refine
        alt_en: product.name_en,
        sort_order: idx,
        is_primary: idx === 0,
        source: p.source,
        source_url: p.source_url,
        photographer: p.photographer,
      });
    });
    productSummaries.push({ slug: product.slug, count: picks.length });
  }

  if (rows.length === 0) {
    console.error(
      "[seed-stock-product-images] no rows to insert — check manifest categories vs. product categories."
    );
    process.exit(1);
  }

  // 3. Insert in chunks (Supabase accepts large batches but 100 is a
  //    safe ceiling that keeps individual error messages readable).
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error: insErr } = await supabase
      .from("product_images")
      .insert(slice);
    if (insErr) throw insErr;
    inserted += slice.length;
  }

  console.log(
    `\n[seed-stock-product-images] inserted ${inserted} rows across ${productSummaries.length} products:`
  );
  for (const s of productSummaries) {
    console.log(`  • ${s.slug.padEnd(34)}  ${s.count} images`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
