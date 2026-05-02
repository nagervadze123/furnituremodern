// Re-exports the slug pipeline as `slugify` so existing call sites keep
// working. The actual logic — NFD-stripping accented Latin, BGN/PCGN
// transliteration of Georgian, hyphen normalization, length cap — lives
// in lib/slug/transliterate.ts where it can also be unit-tested.

import { transliterate } from "./slug/transliterate";

/** Generate a URL-safe slug from arbitrary input. */
export const slugify = transliterate;

/** Quick check used by Zod refinements. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
