// URL-slug helper.
//
// Used by the admin product form to auto-generate slugs from the
// English name. Keep it simple: lowercase ASCII letters, digits, and
// dashes. Admins can always type a slug manually if the auto value
// isn't what they want.

/**
 * Generate a slug from an arbitrary string.
 *
 * - Lowercases the input
 * - Strips diacritics (NFD-normalize then drop combining marks)
 * - Converts non-alphanumeric runs to single dashes
 * - Trims leading and trailing dashes
 *
 * Non-ASCII letters (e.g. Georgian) are removed entirely. If you want
 * a Georgian slug, type it in directly — transliteration is too lossy
 * to do automatically at this scale.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Drop combining diacritical marks.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Replace any sequence of non a-z0-9 with a single dash.
    .replace(/[^a-z0-9]+/g, "-")
    // Trim leading/trailing dashes.
    .replace(/^-+|-+$/g, "")
    // Cap length at a reasonable URL size.
    .slice(0, 80);
}

/** Quick check used by Zod refinements. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
