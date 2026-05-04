// Sort-key vocabulary shared between the page (server) and the
// SortBar (client). Kept in its own module so the page can import
// `parseSortKey` without pulling in the "use client" client island.

export type SortKey = "newest" | "price-asc" | "price-desc";

export const SORT_KEYS: readonly SortKey[] = [
  "newest",
  "price-asc",
  "price-desc",
] as const;

/** Coerce an arbitrary string into a known SortKey, or undefined. */
export function parseSortKey(
  input: string | null | undefined
): SortKey | undefined {
  if (!input) return undefined;
  return (SORT_KEYS as readonly string[]).includes(input)
    ? (input as SortKey)
    : undefined;
}

/**
 * Sort a product list by the chosen key.
 *
 * "newest" — uses createdAt desc when present, falls through to the
 * original order (which is already operator-curated sort_order asc).
 *
 * Returns a NEW array; never mutates the input.
 */
export function sortProducts<
  T extends {
    price: number;
    createdAt?: string;
  },
>(products: readonly T[], key: SortKey | undefined): T[] {
  if (!key || key === "newest") {
    // Preserve the data layer's natural order when no rows have a
    // createdAt timestamp (offline fallback). When at least one does,
    // sort by it descending — newest first.
    const hasTimestamps = products.some((p) => p.createdAt);
    if (!hasTimestamps) return products.slice();
    return [...products].sort((a, b) => {
      const at = a.createdAt ?? "";
      const bt = b.createdAt ?? "";
      return bt.localeCompare(at);
    });
  }
  if (key === "price-asc") {
    return [...products].sort((a, b) => a.price - b.price);
  }
  // price-desc
  return [...products].sort((a, b) => b.price - a.price);
}
