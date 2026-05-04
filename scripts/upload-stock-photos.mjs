#!/usr/bin/env node
// Stock photo uploader. Phase 5 Task 4.
//
// Reads scripts/stock-photos.json + the prepared variants under
// scripts/stock-photos-prepared/ and uploads them to the Supabase
// Storage bucket `product-images` under `stock/` and `stock/thumbs/`.
//
// Idempotent: existing keys are upserted (overwritten) so re-runs after
// regenerating a variant are safe.
//
// Requires .env.local (or process env) to provide:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Usage:
//   node --env-file=.env.local scripts/upload-stock-photos.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "scripts", "stock-photos.json");
const PREPARED = path.join(ROOT, "scripts", "stock-photos-prepared");
const BUCKET = "product-images";
const PREFIX = "stock";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run with: node --env-file=.env.local scripts/upload-stock-photos.mjs"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function uploadOne(localPath, remoteKey) {
  const buf = await fs.readFile(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remoteKey, buf, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000, immutable",
    });
  if (error) throw error;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const photos = Array.isArray(manifest.photos) ? manifest.photos : [];
  if (photos.length === 0) {
    console.warn("[upload-stock-photos] manifest has no entries — nothing to do.");
    return;
  }

  console.log(
    `[upload-stock-photos] uploading ${photos.length} entries to ` +
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/`
  );

  const failed = [];
  let done = 0;
  for (const entry of photos) {
    const fullSrc = path.join(PREPARED, entry.filename);
    const thumbSrc = path.join(PREPARED, "thumbs", entry.filename);
    try {
      await uploadOne(fullSrc, `${PREFIX}/${entry.filename}`);
      await uploadOne(thumbSrc, `${PREFIX}/thumbs/${entry.filename}`);
      done += 1;
      // Print every 10 uploads to keep the log readable on big batches.
      if (done % 10 === 0 || done === photos.length) {
        console.log(`  ${done}/${photos.length} uploaded`);
      }
    } catch (err) {
      failed.push({ filename: entry.filename, error: String(err.message ?? err) });
      console.error(`  ✗ ${entry.filename}: ${err.message ?? err}`);
    }
  }

  console.log(
    `\n[upload-stock-photos] done. uploaded=${done} failed=${failed.length}`
  );
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
