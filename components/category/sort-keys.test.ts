// Unit tests for the sort-keys utility used by the category-page sort
// bar. Pure functions — no DOM or runtime mocks needed.

import { describe, it, expect } from "vitest";

import { parseSortKey, sortProducts, SORT_KEYS } from "./sort-keys";

describe("parseSortKey", () => {
  it("returns undefined for null/undefined/empty input", () => {
    expect(parseSortKey(null)).toBeUndefined();
    expect(parseSortKey(undefined)).toBeUndefined();
    expect(parseSortKey("")).toBeUndefined();
  });

  it("rejects unknown values", () => {
    expect(parseSortKey("alphabetical")).toBeUndefined();
    expect(parseSortKey("DROP TABLE")).toBeUndefined();
  });

  it("accepts every member of SORT_KEYS", () => {
    for (const key of SORT_KEYS) {
      expect(parseSortKey(key)).toBe(key);
    }
  });
});

describe("sortProducts", () => {
  type Row = { id: string; price: number; createdAt?: string };

  const rows: Row[] = [
    { id: "a", price: 1000, createdAt: "2026-01-01T00:00:00Z" },
    { id: "b", price: 3000, createdAt: "2026-03-01T00:00:00Z" },
    { id: "c", price: 2000, createdAt: "2026-02-01T00:00:00Z" },
  ];

  it("preserves input order when key is undefined and no createdAt is set", () => {
    const stripped = rows.map(({ id, price }) => ({ id, price }));
    const out = sortProducts(stripped, undefined);
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
    // Returns a new array — never mutates input.
    expect(out).not.toBe(stripped);
  });

  it("newest sorts createdAt descending when timestamps are present", () => {
    const out = sortProducts(rows, "newest");
    expect(out.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("price-asc sorts by price ascending", () => {
    const out = sortProducts(rows, "price-asc");
    expect(out.map((r) => r.price)).toEqual([1000, 2000, 3000]);
  });

  it("price-desc sorts by price descending", () => {
    const out = sortProducts(rows, "price-desc");
    expect(out.map((r) => r.price)).toEqual([3000, 2000, 1000]);
  });

  it("never mutates the input array", () => {
    const before = [...rows];
    sortProducts(rows, "price-desc");
    expect(rows).toEqual(before);
  });
});
