// Runtime font loader for ImageResponse rendering.
//
// Satori (the renderer behind next/og) needs the font binary as an
// ArrayBuffer, not a CSS reference. The cleanest cross-runtime way to
// get one is to fetch Google Fonts' CSS API with an old User-Agent —
// that forces TTF/OTF responses (modern UAs get woff2, which Satori
// does not parse). The bytes are cached by Next's fetch cache so we
// only hit the network on cold renders.
//
// Two families are loaded:
//   • Noto Serif Georgian — paired with `font-georgian-serif` in the
//     site CSS, used for Georgian headlines on OG cards.
//   • Fraunces — the Latin display face already configured at the
//     layout level (`--font-display`), used for English headlines.
//
// Each family is fetched at weight 400 (regular) and 700 (bold). The
// resulting array is the shape ImageResponse's `fonts` option expects.

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

// Forces Google Fonts to serve a TTF file rather than woff2 — needed
// because Satori only parses ttf/otf/woff. Old IE UA does the trick.
const LEGACY_UA =
  "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)";

async function fetchGoogleFontTtf(
  family: string,
  weight: 400 | 700
): Promise<ArrayBuffer | null> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&display=swap`;

  try {
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": LEGACY_UA },
      // Long-lived cache — fonts don't change. revalidation tied to
      // build cadence is fine.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(
      /src:\s*url\(([^)]+)\)\s*format\(['"]?(truetype|opentype)['"]?\)/
    );
    if (!match) return null;
    const fontUrl = match[1]!.trim().replace(/^['"]|['"]$/g, "");
    const fontRes = await fetch(fontUrl, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    // Network/egress restrictions or Google Fonts hiccup — caller
    // falls back to Satori's default font so the image still renders.
    return null;
  }
}

/**
 * Load both font families at 400 + 700 in parallel. Any individual
 * fetch that fails is silently dropped — Satori falls back to its
 * built-in sans for that family. The image still renders.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const requests: Array<{ family: string; weight: 400 | 700 }> = [
    { family: OG_FONT_FAMILY.georgianSerif, weight: 400 },
    { family: OG_FONT_FAMILY.georgianSerif, weight: 700 },
    { family: OG_FONT_FAMILY.latinDisplay, weight: 400 },
    { family: OG_FONT_FAMILY.latinDisplay, weight: 700 },
  ];

  const results = await Promise.all(
    requests.map(async ({ family, weight }) => {
      const data = await fetchGoogleFontTtf(family, weight);
      if (!data) return null;
      return {
        name: family,
        data,
        style: "normal" as const,
        weight,
      } satisfies OgFont;
    })
  );

  return results.filter((f): f is OgFont => f !== null);
}
