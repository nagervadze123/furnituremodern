// Regression guards for the italic Fraunces caption beneath the H1
// in ProductLayout (Slice 7, PDP editorial port). Two concerns
// landed on the merge gate:
//
//   1. The caption must omit cleanly when `name.en` is missing or
//      empty — no "undefined — N°…" or " — N°…" artifact for
//      products that only carry `name.ka`.
//
//   2. The caption is the bilingual editorial pairing, not a
//      localized field. It must read the same on /ka and /en — no
//      locale parameter, no equality dance against `name[locale]`.
//      The earlier draft compared `name.en !== name[locale]` and
//      silently swallowed the Latin pairing on /en, breaking the
//      rhythm the design reference depends on.
//
// `getProductCaption` is exported from the layout module precisely
// so this test can exercise the truthy/empty/missing matrix without
// rendering the full server component (no DOM, no next-intl, no
// Supabase). The function takes only `product`; there is no
// `locale` argument by construction.
//
// next-intl + the locale-aware Link export are mocked because the
// source module's transitive imports otherwise pull `next/navigation`
// into a vitest run that lacks Next's runtime shim; the mocks let
// the helper be imported in isolation, mirroring the
// FeaturedCategories.test.tsx pattern from Slice 4.

import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
}));

vi.mock("@/lib/data/products", () => ({
  getProducts: async () => [],
}));

import { getProductCaption } from "./ProductLayout";

describe("getProductCaption — caption beneath the PDP H1", () => {
  it("joins name.en and SKU with an em-dash separator", () => {
    expect(
      getProductCaption({
        name: { en: "Alazani sofa" },
        sku: "SF-240",
      })
    ).toBe("Alazani sofa — N°SF-240");
  });

  it("omits cleanly when name.en is an empty string (only name.ka filled)", () => {
    // The earlier draft pushed `""` because `"" !== "..."` was true,
    // producing " — N°SF-240". The truthy guard is what fixes this.
    expect(
      getProductCaption({
        name: { en: "" },
        sku: "SF-240",
      })
    ).toBe("N°SF-240");
  });

  it("returns null when both name.en and SKU are missing", () => {
    expect(
      getProductCaption({
        name: { en: "" },
        sku: null,
      })
    ).toBeNull();
    expect(
      getProductCaption({
        name: { en: "" },
        sku: undefined,
      })
    ).toBeNull();
  });

  it("emits only the SKU when name.en is empty but SKU is set", () => {
    expect(
      getProductCaption({
        name: { en: "" },
        sku: "SF-240",
      })
    ).toBe("N°SF-240");
  });

  it("emits only the Latin name when SKU is missing but name.en is set", () => {
    expect(
      getProductCaption({
        name: { en: "Alazani sofa" },
        sku: null,
      })
    ).toBe("Alazani sofa");
  });

  it("is locale-independent — no locale parameter, same output regardless of page locale", () => {
    // The function takes only `product`. The bilingual editorial
    // pairing is a property of the product, not the page locale.
    // This test locks the absence of a locale-bound branch: the
    // same product object yields the same caption every call.
    const product = {
      name: { en: "Alazani sofa" },
      sku: "SF-240",
    };
    const first = getProductCaption(product);
    const second = getProductCaption(product);
    expect(first).toBe("Alazani sofa — N°SF-240");
    expect(second).toBe(first);
  });
});
