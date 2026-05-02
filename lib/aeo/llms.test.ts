import { describe, it, expect } from "vitest";
import {
  buildLlmsIndex,
  buildLlmsFull,
  freshnessTimestamp,
} from "./llms";
import type { DataCategory, DataProduct } from "@/lib/data/types";

const CATS: DataCategory[] = [
  {
    slug: "sofas",
    name: { ka: "დივნები", en: "Sofas" },
    description: { ka: "ქართული აღწერა", en: "English description" },
    sortOrder: 0,
  },
  {
    slug: "bedrooms",
    name: { ka: "საძინებლები", en: "Bedrooms" },
    description: { ka: "ქართული აღწერა", en: "English description" },
    sortOrder: 1,
  },
];

const PRODUCT: DataProduct = {
  id: "p_1",
  slug: "linen-three-seater",
  category: "sofas",
  name: { ka: "სელის დივანი", en: "Linen Three-Seater" },
  description: { ka: "მოკლე ქართული", en: "Short English" },
  price: 4200,
  currency: "GEL",
  images: [],
  updatedAt: "2026-04-01T10:00:00.000Z",
};

describe("freshnessTimestamp", () => {
  it("returns the latest updatedAt as YYYY-MM-DD", () => {
    const out = freshnessTimestamp([
      { ...PRODUCT, updatedAt: "2026-03-01T00:00:00.000Z" },
      { ...PRODUCT, updatedAt: "2026-04-15T00:00:00.000Z" },
      { ...PRODUCT, updatedAt: "2026-02-20T00:00:00.000Z" },
    ]);
    expect(out).toBe("2026-04-15");
  });

  it("falls back to createdAt when updatedAt is missing", () => {
    const out = freshnessTimestamp([
      { ...PRODUCT, updatedAt: undefined, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(out).toBe("2026-01-01");
  });

  it("returns undefined when no timestamps are available", () => {
    const out = freshnessTimestamp([
      { ...PRODUCT, updatedAt: undefined, createdAt: undefined },
    ]);
    expect(out).toBeUndefined();
  });
});

describe("buildLlmsIndex", () => {
  it("emits Georgian first, then English", () => {
    const out = buildLlmsIndex({ cats: CATS });
    const ka = out.indexOf("# ქართული");
    const en = out.indexOf("# English");
    expect(ka).toBeGreaterThanOrEqual(0);
    expect(en).toBeGreaterThan(ka);
  });

  it("includes every category with an absolute URL", () => {
    const out = buildLlmsIndex({ cats: CATS });
    expect(out).toContain("/ka/sofas");
    expect(out).toContain("/en/sofas");
    expect(out).toContain("/ka/bedrooms");
    expect(out).toContain("/en/bedrooms");
  });

  it("emits a Last regenerated line when given a timestamp", () => {
    const out = buildLlmsIndex({ cats: CATS, lastRegenerated: "2026-04-15" });
    expect(out.startsWith("Last regenerated: 2026-04-15")).toBe(true);
  });

  it("omits the Last regenerated line when no timestamp is given", () => {
    const out = buildLlmsIndex({ cats: CATS });
    expect(out.startsWith("Last regenerated:")).toBe(false);
  });

  it("does not advertise admin routes as public URLs", () => {
    const out = buildLlmsIndex({ cats: CATS });
    // The indexing note legitimately mentions "/admin/*"; we only
    // care that no full http(s) URL with /admin in its path appears
    // in a list bullet (which would imply "go index this").
    const adminUrlPattern = /https?:\/\/\S*\/admin\b/;
    expect(out).not.toMatch(adminUrlPattern);
    expect(out).not.toMatch(/https?:\/\/\S*\/api\/admin\b/);
  });

  it("includes the indexing-note for admin paths", () => {
    const out = buildLlmsIndex({ cats: CATS });
    // Both languages mention the admin-not-public note.
    expect(out).toContain("/admin/*");
  });
});

describe("buildLlmsFull", () => {
  it("includes both locales' product summaries with absolute URLs", () => {
    const out = buildLlmsFull({ cats: CATS, products: [PRODUCT] });
    expect(out).toContain(`/ka/sofas/${PRODUCT.slug}`);
    expect(out).toContain(`/en/sofas/${PRODUCT.slug}`);
    expect(out).toContain(PRODUCT.name.ka);
    expect(out).toContain(PRODUCT.name.en);
  });

  it("groups products under their category", () => {
    const sofa = { ...PRODUCT, category: "sofas" as const, slug: "a" };
    const bed = { ...PRODUCT, category: "bedrooms" as const, slug: "b" };
    const out = buildLlmsFull({ cats: CATS, products: [sofa, bed] });
    // Sofas heading (ka) should appear before its product slug "a"
    // and likewise for bedrooms / "b".
    const sofaHead = out.indexOf("დივნები");
    const aSlug = out.indexOf("/ka/sofas/a");
    const bedHead = out.indexOf("საძინებლები");
    const bSlug = out.indexOf("/ka/bedrooms/b");
    expect(sofaHead).toBeGreaterThan(-1);
    expect(aSlug).toBeGreaterThan(sofaHead);
    expect(bedHead).toBeGreaterThan(-1);
    expect(bSlug).toBeGreaterThan(bedHead);
  });

  it("includes price + currency in each product summary", () => {
    const out = buildLlmsFull({ cats: CATS, products: [PRODUCT] });
    expect(out).toContain(`${PRODUCT.price} ${PRODUCT.currency}`);
  });

  it("omits unknown product fields without leaking 'undefined' tokens", () => {
    const minimal: DataProduct = { ...PRODUCT, material: undefined, color: undefined };
    const out = buildLlmsFull({ cats: CATS, products: [minimal] });
    expect(out).not.toMatch(/undefined/);
  });

  it("does not expose admin URLs as public routes", () => {
    const out = buildLlmsFull({ cats: CATS, products: [PRODUCT] });
    expect(out).not.toMatch(/https?:\/\/\S*\/admin\/products/);
    expect(out).not.toMatch(/https?:\/\/\S*\/admin\/categories/);
  });

  it("is deterministic for identical inputs", () => {
    const a = buildLlmsFull({ cats: CATS, products: [PRODUCT], lastRegenerated: "2026-04-15" });
    const b = buildLlmsFull({ cats: CATS, products: [PRODUCT], lastRegenerated: "2026-04-15" });
    expect(a).toBe(b);
  });
});
