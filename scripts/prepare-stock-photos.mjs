#!/usr/bin/env node
// Stock photo preparation pipeline. Phase 5 Task 4.
//
// Reads scripts/stock-photos.json. For each entry:
//   1. If scripts/stock-photos-source/<filename> is missing, downloads
//      the original from `image_url` so the operator does not have to
//      manually click-save 60+ files. Direct CDN URLs from Pexels and
//      Unsplash work without API keys.
//   2. Resizes via sharp into two variants:
//        • full  → max 2400px on the long edge, quality 85 JPEG
//        • thumb → max 800px  on the long edge, quality 82 JPEG
//      Next/Image regenerates AVIF/WebP at delivery time so we keep the
//      stored variants as wide-compat JPEG.
//   3. Writes outputs to scripts/stock-photos-prepared/<filename> and
//      scripts/stock-photos-prepared/thumbs/<filename>.
//
// Re-runs are idempotent: existing outputs are skipped unless --force.
//
// Usage:
//   node scripts/prepare-stock-photos.mjs           # incremental
//   node scripts/prepare-stock-photos.mjs --force   # rebuild all variants

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts", "stock-photos.json");
const SOURCE_DIR = path.join(ROOT, "scripts", "stock-photos-source");
const OUT_DIR = path.join(ROOT, "scripts", "stock-photos-prepared");
const THUMB_DIR = path.join(OUT_DIR, "thumbs");

const FULL_MAX = 2400;
const THUMB_MAX = 800;
const FULL_QUALITY = 85;
const THUMB_QUALITY = 82;

const FORCE = process.argv.includes("--force");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadIfMissing(entry) {
  const target = path.join(SOURCE_DIR, entry.filename);
  if (await exists(target)) return { downloaded: false, path: target };

  if (!entry.image_url) {
    throw new Error(
      `${entry.filename}: missing source file and no image_url to download from`
    );
  }

  const res = await fetch(entry.image_url, {
    headers: {
      // Some CDNs serve different content based on UA / Accept; mimic a
      // browser so Pexels/Unsplash return the JPEG instead of redirecting
      // to an HTML landing page.
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      `${entry.filename}: download failed (${res.status}) from ${entry.image_url}`
    );
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) {
    throw new Error(
      `${entry.filename}: expected image/*, got "${ct}" from ${entry.image_url}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(target, buf);
  return { downloaded: true, path: target };
}

async function processEntry(entry) {
  const fullOut = path.join(OUT_DIR, entry.filename);
  const thumbOut = path.join(THUMB_DIR, entry.filename);

  if (!FORCE && (await exists(fullOut)) && (await exists(thumbOut))) {
    return { status: "skip" };
  }

  const { downloaded, path: src } = await downloadIfMissing(entry);

  // Read once, fork into two pipelines. `withMetadata({ orientation: 1 })`
  // strips EXIF (privacy: no GPS, no camera serial in stored files) but
  // preserves the rotation hint so portrait shots stay portrait.
  const input = await fs.readFile(src);
  const baseMeta = await sharp(input).metadata();

  await sharp(input)
    .rotate()
    .resize({
      width: FULL_MAX,
      height: FULL_MAX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: FULL_QUALITY, mozjpeg: true })
    .toFile(fullOut);

  await sharp(input)
    .rotate()
    .resize({
      width: THUMB_MAX,
      height: THUMB_MAX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toFile(thumbOut);

  return {
    status: downloaded ? "downloaded+processed" : "processed",
    inDim: `${baseMeta.width}×${baseMeta.height}`,
  };
}

async function main() {
  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });

  const raw = await fs.readFile(MANIFEST, "utf8");
  const manifest = JSON.parse(raw);
  const photos = Array.isArray(manifest.photos) ? manifest.photos : [];

  if (photos.length === 0) {
    console.warn(
      "[prepare-stock-photos] manifest has no entries — nothing to do."
    );
    return;
  }

  console.log(
    `[prepare-stock-photos] processing ${photos.length} entries (force=${FORCE})`
  );

  const results = { skip: 0, processed: 0, downloaded: 0, failed: [] };

  for (const entry of photos) {
    if (!entry.filename) {
      console.warn("  skipping entry without filename:", entry);
      continue;
    }
    try {
      const r = await processEntry(entry);
      if (r.status === "skip") {
        results.skip += 1;
      } else {
        results.processed += 1;
        if (r.status.startsWith("downloaded")) results.downloaded += 1;
        console.log(`  ✓ ${entry.filename}  (${r.status}, ${r.inDim ?? "?"})`);
      }
    } catch (err) {
      results.failed.push({ filename: entry.filename, error: String(err) });
      console.error(`  ✗ ${entry.filename}: ${err.message ?? err}`);
    }
  }

  console.log(
    `\n[prepare-stock-photos] done. processed=${results.processed} ` +
      `skipped=${results.skip} downloaded=${results.downloaded} ` +
      `failed=${results.failed.length}`
  );

  if (results.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
