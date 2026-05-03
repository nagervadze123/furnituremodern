// Canonical OG image dimensions used by every opengraph-image and
// twitter-image route in this project. Centralised so the templates,
// the route handlers, and the test snapshots all agree on a single
// source of truth.
//
//   • OG (1200×630) is the standard Open Graph aspect — what Facebook,
//     X (summary_large_image), LinkedIn, WhatsApp and most messengers
//     unfurl.
//   • SQUARE (600×600) covers the LinkedIn newer-style preview, some
//     iMessage tiles and any platform that prefers a square thumbnail.

export const OG_DIMENSIONS = { width: 1200, height: 630 } as const;
export const SQUARE_DIMENSIONS = { width: 600, height: 600 } as const;

export type OgDimensions = { width: number; height: number };

/** Returns true when the dimensions describe a square card. */
export function isSquare(dim: OgDimensions): boolean {
  return dim.width === dim.height;
}

// Cache headers exported as a constant so every ImageResponse handler
// applies the same TTL — 1h fresh, 1d stale-while-revalidate. Mirrors
// the static rules in next.config.ts so behaviour is consistent whether
// the response is generated at build time or at request time.
export const OG_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
} as const;
