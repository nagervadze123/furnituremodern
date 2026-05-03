#!/usr/bin/env node
// Placeholder PWA icon generator.
//
// Renders a simple "F" monogram in the brand ink/cream palette, then
// rasterises it to every PNG size the manifest, favicon, and Apple touch
// icon need — plus a multi-image favicon.ico. Sharp is already pulled in
// as a transitive dep of Next.js, so no new package is required.
//
// Run after the brand identity changes:
//   node scripts/generate-icons.mjs
//
// All outputs land in public/. The committed PNGs are the source of
// truth; this script is a regen helper, not a build step.

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

// Brand colours — keep in sync with app/globals.css :root tokens.
// Translated from oklch() to sRGB hex so libvips/librsvg can rasterise
// without OK-Lab support.
const INK = "#1a1611";
const CREAM = "#fafaf6";

// Hand-drawn "F" path inside a 512×512 viewBox. Sits inside the maskable
// safe area (inner 80% — 51 to 461 on each axis) so the same path works
// for both the rounded "any" icon and the full-bleed maskable variant.
const LETTER_PATH =
  "M 161 128 H 351 V 186 H 219 V 222 H 319 V 280 H 219 V 384 H 161 Z";

function buildSvg({ rounded }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="96" ry="96" fill="${INK}"/>`
    : `<rect width="512" height="512" fill="${INK}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${bg}
  <path d="${LETTER_PATH}" fill="${CREAM}"/>
</svg>`;
}

const ROUNDED_SVG = buildSvg({ rounded: true });
const FULL_BLEED_SVG = buildSvg({ rounded: false });

async function rasterise(svg, size) {
  return sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Hand-rolled multi-image ICO builder. Modern browsers accept PNG-encoded
// ICO entries; bundling 16/32/48 covers Windows/legacy clients.
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(images.length, 4); // image count

  let offset = 6 + images.length * 16;
  const dirEntries = [];
  for (const { width, height, buffer } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // colour palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((i) => i.buffer)]);
}

async function main() {
  await fs.mkdir(PUBLIC, { recursive: true });

  // 1. Source SVG — committed and also served at /icon.svg.
  await fs.writeFile(path.join(PUBLIC, "icon.svg"), ROUNDED_SVG, "utf8");

  // 2. Rounded PNGs — browser tab + Android home screen + favicons.
  const rounded192 = await rasterise(ROUNDED_SVG, 192);
  const rounded512 = await rasterise(ROUNDED_SVG, 512);
  const fav16 = await rasterise(ROUNDED_SVG, 16);
  const fav32 = await rasterise(ROUNDED_SVG, 32);
  const fav48 = await rasterise(ROUNDED_SVG, 48);
  await fs.writeFile(path.join(PUBLIC, "icon-192.png"), rounded192);
  await fs.writeFile(path.join(PUBLIC, "icon-512.png"), rounded512);
  await fs.writeFile(path.join(PUBLIC, "favicon-16x16.png"), fav16);
  await fs.writeFile(path.join(PUBLIC, "favicon-32x32.png"), fav32);

  // 3. Full-bleed PNGs — iOS home screen + Android adaptive (maskable).
  const apple180 = await rasterise(FULL_BLEED_SVG, 180);
  const maskable512 = await rasterise(FULL_BLEED_SVG, 512);
  await fs.writeFile(path.join(PUBLIC, "apple-touch-icon.png"), apple180);
  await fs.writeFile(path.join(PUBLIC, "icon-maskable-512.png"), maskable512);

  // 4. Multi-image favicon.ico (16/32/48).
  const ico = buildIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 },
  ]);
  await fs.writeFile(path.join(PUBLIC, "favicon.ico"), ico);

  console.log("Icons regenerated in public/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
