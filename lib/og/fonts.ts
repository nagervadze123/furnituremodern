// Build-time font loader for ImageResponse rendering.
//
// Satori (the renderer behind next/og) needs an actual font binary —
// ttf, otf, or woff. The previous runtime-fetch approach against
// fonts.googleapis.com with a legacy IE6 User-Agent silently returned
// EOT (Embedded OpenType, IE-only) which Satori cannot parse, so the
// Georgian font never registered and `ka` text rendered as tofu.
//
// We now read the font binaries straight out of `node_modules` via the
// @fontsource packages — no network, no User-Agent gymnastics, no
// CSS-parsing edge cases. Each family ships its unicode-range subsets
// as separate woff files; we register every relevant subset under the
// same family name so Satori auto-picks the right glyph per char.
//
// Subsets loaded (kept tight so the bundle stays well under Satori's
// 500 KB ceiling):
//   • Noto Serif Georgian — `georgian` + `latin`     (400 + 700)
//   • Fraunces            — `latin`    + `latin-ext` (400 + 700)
//
// Why both subsets per family?
//   • Georgian text mixes Georgian glyphs with ASCII digits/punctuation
//     (e.g. "კატეგორია · სოფა" or a price like "2 400 GEL") — without
//     the Latin subset registered, those code points fall through to
//     Satori's default font and break visual cohesion.
//   • Fraunces ships the GEL currency-symbol-like glyphs in latin-ext.
//
// The `node:fs/promises` import below makes this module strictly
// server-only without needing the `server-only` marker — it would
// throw at bundle time if pulled into a client component.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locale } from "@/i18n/routing";

// Public family names. Kept in one place so the templates pick the
// right font-family string and the loader requests the matching files.
export const OG_FONT_FAMILY = {
  georgianSerif: "Noto Serif Georgian",
  latinDisplay: "Fraunces",
} as const;

// Picks the headline font family for a given locale. Georgian glyphs
// only exist in Noto Serif Georgian; English copy uses Fraunces.
export function headlineFontFamily(locale: Locale): string {
  return locale === "ka"
    ? OG_FONT_FAMILY.georgianSerif
    : OG_FONT_FAMILY.latinDisplay;
}

// Sans-fallback for body text on the OG card. We use the same display
// family for subtitle/eyebrow copy — Fraunces in regular weight reads
// well at the small sizes; Noto Serif Georgian handles ka subtitles.
export function subtitleFontFamily(locale: Locale): string {
  return headlineFontFamily(locale);
}

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: 400 | 700;
};

type FontSpec = {
  name: string;
  weight: 400 | 700;
  /** Path inside the project root pointing at a ttf/otf/woff binary. */
  filePath: string;
};

// Concrete files we ship to Satori. Paths are relative to project root
// so they survive `process.cwd()` resolution at build time and inside
// the .next build output. The fontsource files are flat (no subset
// directories) which keeps these paths predictable.
const FONT_FILES: FontSpec[] = [
  // --- Noto Serif Georgian: Georgian subset (the entire reason we
  // bundle this family — has the U+10A0..U+10FF + U+2D00..U+2D2F glyphs).
  {
    name: OG_FONT_FAMILY.georgianSerif,
    weight: 400,
    filePath:
      "node_modules/@fontsource/noto-serif-georgian/files/noto-serif-georgian-georgian-400-normal.woff",
  },
  {
    name: OG_FONT_FAMILY.georgianSerif,
    weight: 700,
    filePath:
      "node_modules/@fontsource/noto-serif-georgian/files/noto-serif-georgian-georgian-700-normal.woff",
  },
  // --- Noto Serif Georgian: Latin subset for ASCII digits/punctuation
  // that appear inside Georgian copy (e.g. price "2 400 GEL").
  {
    name: OG_FONT_FAMILY.georgianSerif,
    weight: 400,
    filePath:
      "node_modules/@fontsource/noto-serif-georgian/files/noto-serif-georgian-latin-400-normal.woff",
  },
  {
    name: OG_FONT_FAMILY.georgianSerif,
    weight: 700,
    filePath:
      "node_modules/@fontsource/noto-serif-georgian/files/noto-serif-georgian-latin-700-normal.woff",
  },
  // --- Fraunces: Latin (primary) + latin-ext (covers the long dash and
  // a few extra Latin code points used in eyebrows like "Furnituremodern").
  {
    name: OG_FONT_FAMILY.latinDisplay,
    weight: 400,
    filePath:
      "node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
  },
  {
    name: OG_FONT_FAMILY.latinDisplay,
    weight: 700,
    filePath:
      "node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff",
  },
  {
    name: OG_FONT_FAMILY.latinDisplay,
    weight: 400,
    filePath:
      "node_modules/@fontsource/fraunces/files/fraunces-latin-ext-400-normal.woff",
  },
  {
    name: OG_FONT_FAMILY.latinDisplay,
    weight: 700,
    filePath:
      "node_modules/@fontsource/fraunces/files/fraunces-latin-ext-700-normal.woff",
  },
];

async function readFontFile(spec: FontSpec): Promise<OgFont | null> {
  // turbopackIgnore prevents Turbopack from chasing the dynamic
  // path.join() into the rest of the project tree (which fires its
  // "whole project was traced unintentionally" build warning) — the
  // path is build-time-only and resolves under node_modules anyway.
  const absolute = join(
    /* turbopackIgnore: true */ process.cwd(),
    spec.filePath
  );
  try {
    const buf = await readFile(absolute);
    if (buf.byteLength === 0) {
      console.warn(
        `[lib/og/fonts] empty font file at ${spec.filePath} — Satori will fall back`
      );
      return null;
    }
    // Copy into a fresh ArrayBuffer so the slice the caller receives
    // owns its own memory (avoids odd Satori parsing on Node Buffer's
    // shared underlying storage).
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    return {
      name: spec.name,
      data: ab,
      style: "normal",
      weight: spec.weight,
    };
  } catch (err) {
    console.warn(
      `[lib/og/fonts] failed to read ${spec.filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

/**
 * Read every font subset registered above. Satori uses the order to
 * resolve glyphs: the first registration with the right family that
 * contains the codepoint wins. Failures are logged (visible during
 * build) and skipped — Satori falls back to its default font for any
 * missing family, so the image still renders, but Georgian text would
 * regress to tofu — which is exactly the bug we're fixing here.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const results = await Promise.all(FONT_FILES.map(readFontFile));
  return results.filter((f): f is OgFont => f !== null);
}

/**
 * Test hook — exposes the spec list so tests can iterate every font
 * file the loader will read without duplicating the path strings.
 */
export const OG_FONT_FILE_SPECS: ReadonlyArray<FontSpec> = FONT_FILES;
