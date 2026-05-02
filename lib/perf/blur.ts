// Tiny inline blur-placeholder helper.
//
// Generates a 4-stop linear-gradient SVG, base64-encoded as a
// data URL, suitable for next/image's `blurDataURL` prop. We avoid
// fetching remote images at build time (no remote-host build-time
// dependency) and avoid pulling in a 200KB sharp/canvas dependency.
//
// The output is intentionally low-fidelity (just a soft blob of
// the brand neutral palette). It's not a per-image color average —
// for true average-color we'd need to read the source bytes, which
// we don't have for picsum/Supabase URLs at SSR time. This is good
// enough to prevent flash-of-unstyled-image and CLS on slow networks.

const DEFAULT_PALETTE = {
  // Soft warm-cream background that matches globals.css --background
  // and --muted; identical for ka and en since the palette is
  // brand-wide, not locale-specific.
  light: "#f1ebe2",
  mid: "#d9d0c1",
  dark: "#a3998a",
};

// Encode a string to base64 in a way that works in both Node (SSR)
// and the browser (RSC dehydration). btoa exists in modern Node 20+.
function toBase64(s: string): string {
  if (typeof btoa === "function") return btoa(s);
  // Node fallback if btoa is somehow unavailable.
  return Buffer.from(s, "binary").toString("base64");
}

export type BlurPalette = Partial<typeof DEFAULT_PALETTE>;

// Build the SVG markup. width/height are intentionally tiny — Next will
// upscale the placeholder to the rendered <img> size and apply blur
// itself, so 4×5 is enough to avoid sharp edges.
function svgFor(palette: typeof DEFAULT_PALETTE, aspect: "portrait" | "landscape"): string {
  const w = aspect === "portrait" ? 4 : 5;
  const h = aspect === "portrait" ? 5 : 4;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`,
    `<defs>`,
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${palette.light}"/>`,
    `<stop offset="60%" stop-color="${palette.mid}"/>`,
    `<stop offset="100%" stop-color="${palette.dark}"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="${w}" height="${h}" fill="url(#g)"/>`,
    `</svg>`,
  ].join("");
}

export function makeBlurDataUrl(
  aspect: "portrait" | "landscape" = "portrait",
  override?: BlurPalette
): string {
  const palette = { ...DEFAULT_PALETTE, ...override };
  const svg = svgFor(palette, aspect);
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

// Convenience: the brand-default placeholder for the 4:5 product/
// category card aspect we use everywhere. Reused so we generate the
// data URL once at module load instead of on every component render.
export const BRAND_PORTRAIT_BLUR = makeBlurDataUrl("portrait");
export const BRAND_LANDSCAPE_BLUR = makeBlurDataUrl("landscape");
