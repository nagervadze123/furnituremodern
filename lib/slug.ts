import { transliterate } from "./slug/transliterate";

const ASCII_LETTERS_DIGITS = /^[\x00-\x7F]+$/;

/**
 * Generate a slug from an arbitrary string.
 *
 * - For Georgian or mixed-script input, delegates to BGN/PCGN
 *   transliteration in lib/slug/transliterate.ts.
 * - For pure-ASCII input keeps the old fast path: lowercase, strip
 *   diacritics, collapse non-alphanumerics to hyphens, trim, cap at 80.
 */
export function slugify(input: string): string {
  if (!input) return "";
  if (!ASCII_LETTERS_DIGITS.test(input)) {
    return transliterate(input);
  }
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Quick check used by Zod refinements. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
