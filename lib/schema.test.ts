import { describe, it, expect } from "vitest";
import {
  cleanJsonLd,
  organizationJsonLd,
  localBusinessJsonLd,
  websiteJsonLd,
  webPageJsonLd,
  collectionPageJsonLd,
  breadcrumbListJsonLd,
  itemListJsonLd,
  productJsonLd,
  faqPageJsonLd,
  speakableSpecificationJsonLd,
  inLanguageFor,
} from "./schema";
import type { DataProduct } from "./data/types";

const SAMPLE_PRODUCT: DataProduct = {
  id: "p_1",
  slug: "linen-three-seater",
  category: "sofas",
  name: { ka: "სელის დივანი", en: "Linen Three-Seater" },
  description: { ka: "მოკლე აღწერა", en: "Short description" },
  price: 4200,
  currency: "GEL",
  images: [
    {
      url: "https://example.com/sofa.jpg",
      alt: { ka: "alt", en: "alt" },
      width: 1200,
      height: 900,
    },
  ],
};

const SAMPLE_PRODUCT_FULL: DataProduct = {
  ...SAMPLE_PRODUCT,
  sku: "FM-SOFA-001",
  mpn: "MPN-LINEN-3S",
  color: "Cream",
  material: "Linen, Oak",
  dimensions: { width: 220, height: 80, depth: 95, unitCode: "CMT" },
  weight: { value: 48, unitCode: "KGM" },
  availability: "InStock",
  condition: "NewCondition",
};

describe("cleanJsonLd", () => {
  it("removes top-level undefined values", () => {
    const out = cleanJsonLd({ a: 1, b: undefined, c: "x" });
    expect(out).toEqual({ a: 1, c: "x" });
  });

  it("removes nested undefined and null", () => {
    const out = cleanJsonLd({
      a: { b: 1, c: undefined, d: null, e: { f: undefined } },
    });
    expect(out).toEqual({ a: { b: 1 } });
  });

  it("keeps explicit zero values (numbers/booleans)", () => {
    const out = cleanJsonLd({ price: 0, isFree: false, empty: "" });
    expect(out).toEqual({ price: 0, isFree: false, empty: "" });
  });

  it("filters undefined out of arrays", () => {
    const out = cleanJsonLd([1, undefined, 2, null, 3] as unknown[]);
    expect(out).toEqual([1, 2, 3]);
  });
});

describe("inLanguageFor", () => {
  it("maps ka to ka-GE and en to en-US", () => {
    expect(inLanguageFor("ka")).toBe("ka-GE");
    expect(inLanguageFor("en")).toBe("en-US");
  });
});

describe("organizationJsonLd", () => {
  it("emits @context, @type, @id, name, url", () => {
    const o = organizationJsonLd();
    expect(o["@context"]).toBe("https://schema.org");
    expect(o["@type"]).toBe("Organization");
    expect((o["@id"] as string).endsWith("#organization")).toBe(true);
    expect(o.name).toBeTruthy();
    expect(o.url).toBeTruthy();
  });
});

describe("localBusinessJsonLd", () => {
  it("emits FurnitureStore type with required business fields", () => {
    const o = localBusinessJsonLd();
    expect(o["@type"]).toBe("FurnitureStore");
    expect(o.name).toBeTruthy();
    expect(o.legalName).toBeTruthy();
    expect(o.priceRange).toBeTruthy();
    expect(o.currenciesAccepted).toBeTruthy();
    expect(o.address).toBeTruthy();
    expect(o.geo).toBeTruthy();
    expect(Array.isArray(o.openingHoursSpecification)).toBe(true);
  });

  it("includes areaServed Country GE", () => {
    const o = localBusinessJsonLd();
    const area = o.areaServed as { "@type": string; name: string };
    expect(area["@type"]).toBe("Country");
    expect(area.name).toBe("GE");
  });
});

describe("websiteJsonLd", () => {
  it("includes a SearchAction targeting /{locale}/search?q=", () => {
    const o = websiteJsonLd("ka");
    const action = o.potentialAction as {
      "@type": string;
      target: { urlTemplate: string };
      "query-input": string;
    };
    expect(action["@type"]).toBe("SearchAction");
    expect(action.target.urlTemplate).toMatch(
      /\/ka\/search\?q=\{search_term_string\}$/
    );
    expect(action["query-input"]).toBe("required name=search_term_string");
  });

  it("uses BCP-47 inLanguage for English (en-US)", () => {
    const o = websiteJsonLd("en");
    expect(o.inLanguage).toBe("en-US");
  });
});

describe("webPageJsonLd / collectionPageJsonLd", () => {
  it("WebPage references Organization + WebSite via @id", () => {
    const o = webPageJsonLd({
      locale: "ka",
      url: "https://x/ka",
      name: "Home",
    });
    expect(o["@type"]).toBe("WebPage");
    expect((o.publisher as { "@id": string })["@id"]).toMatch(/#organization$/);
    expect((o.isPartOf as { "@id": string })["@id"]).toMatch(/#website$/);
  });

  it("CollectionPage carries numberOfItems and a stable @id", () => {
    const o = collectionPageJsonLd({
      locale: "ka",
      categorySlug: "sofas",
      name: "Sofas",
      numberOfItems: 6,
    });
    expect(o["@type"]).toBe("CollectionPage");
    expect((o["@id"] as string).endsWith("#collection")).toBe(true);
    expect(o.numberOfItems).toBe(6);
  });
});

describe("breadcrumbListJsonLd", () => {
  it("emits ListItem entries with sequential 1-based positions", () => {
    const o = breadcrumbListJsonLd([
      { name: "Home", url: "/ka" },
      { name: "Sofas", url: "/ka/sofas" },
      { name: "Linen Three-Seater", url: "/ka/sofas/linen-three-seater" },
    ]);
    const items = o.itemListElement as Array<{
      position: number;
      name: string;
      item: string;
    }>;
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[0]!.item).toMatch(/^https?:\/\//);
  });
});

describe("itemListJsonLd", () => {
  it("positions list items 1..n in given order", () => {
    const products: DataProduct[] = [
      { ...SAMPLE_PRODUCT, id: "1", slug: "a" },
      { ...SAMPLE_PRODUCT, id: "2", slug: "b" },
      { ...SAMPLE_PRODUCT, id: "3", slug: "c" },
    ];
    const o = itemListJsonLd("sofas", "ka", products);
    const items = o.itemListElement as Array<{
      position: number;
      url: string;
      item: { "@id": string };
    }>;
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[0]!.url).toMatch(/\/ka\/sofas\/a$/);
    expect(items[2]!.url).toMatch(/\/ka\/sofas\/c$/);
  });

  it("includes numberOfItems matching the array length", () => {
    const products: DataProduct[] = [
      { ...SAMPLE_PRODUCT, id: "1", slug: "a" },
      { ...SAMPLE_PRODUCT, id: "2", slug: "b" },
    ];
    const o = itemListJsonLd("sofas", "ka", products);
    expect(o.numberOfItems).toBe(2);
  });
});

describe("productJsonLd", () => {
  it("includes all required Product/Offer fields with sensible defaults", () => {
    const NOW = new Date("2026-05-02T00:00:00.000Z");
    const o = productJsonLd(SAMPLE_PRODUCT, "ka", NOW);
    expect(o["@type"]).toBe("Product");
    expect(o.name).toBe(SAMPLE_PRODUCT.name.ka);
    expect(o.description).toBe(SAMPLE_PRODUCT.description.ka);
    expect((o.image as string[]).length).toBe(1);
    // Falls back to id when sku is missing.
    expect(o.sku).toBe(SAMPLE_PRODUCT.id);
    const brand = o.brand as { "@type": string; name: string };
    expect(brand["@type"]).toBe("Brand");
    expect(brand.name).toBeTruthy();
    const offer = o.offers as Record<string, unknown>;
    expect(offer["@type"]).toBe("Offer");
    expect(offer.price).toBe(SAMPLE_PRODUCT.price);
    expect(offer.priceCurrency).toBe("GEL");
    expect(offer.availability).toBe("https://schema.org/InStock");
    expect(offer.itemCondition).toBe("https://schema.org/NewCondition");
    expect(offer.hasMerchantReturnPolicy).toBeTruthy();
    expect(offer.shippingDetails).toBeTruthy();
  });

  it("priceValidUntil is exactly 90 days after `now` (YYYY-MM-DD)", () => {
    const NOW = new Date("2026-05-02T00:00:00.000Z");
    const o = productJsonLd(SAMPLE_PRODUCT, "ka", NOW);
    const pvu = (o.offers as { priceValidUntil: string }).priceValidUntil;
    expect(pvu).toBe("2026-07-31");
  });

  it("omits unknown optional fields cleanly (no null leakage)", () => {
    const o = productJsonLd(SAMPLE_PRODUCT, "en");
    expect(o).not.toHaveProperty("mpn");
    expect(o).not.toHaveProperty("color");
    expect(o).not.toHaveProperty("material");
    expect(o).not.toHaveProperty("additionalProperty");
  });

  it("emits PropertyValue entries for known dimensions and weight", () => {
    const o = productJsonLd(SAMPLE_PRODUCT_FULL, "en");
    const props = o.additionalProperty as Array<{
      name: string;
      value: number;
      unitCode: string;
    }>;
    expect(props.map((p) => p.name).sort()).toEqual([
      "depth",
      "height",
      "weight",
      "width",
    ]);
    expect(props.find((p) => p.name === "weight")!.unitCode).toBe("KGM");
    expect(props.find((p) => p.name === "width")!.unitCode).toBe("CMT");
  });

  it("uses sku when present, fallback to id otherwise", () => {
    const withSku = productJsonLd(SAMPLE_PRODUCT_FULL, "en");
    expect(withSku.sku).toBe("FM-SOFA-001");
    const withoutSku = productJsonLd(SAMPLE_PRODUCT, "en");
    expect(withoutSku.sku).toBe(SAMPLE_PRODUCT.id);
  });

  it("@id matches /{locale}/{category}/{slug}#product", () => {
    const o = productJsonLd(SAMPLE_PRODUCT, "ka");
    expect(o["@id"]).toMatch(/\/ka\/sofas\/linen-three-seater#product$/);
  });
});

describe("faqPageJsonLd", () => {
  it("attaches a SpeakableSpecification pointing at .fm-faq-answer", () => {
    const o = faqPageJsonLd([{ question: "q", answer: "a" }]);
    const speakable = o.speakable as {
      "@type": string;
      cssSelector: string[];
    };
    expect(speakable["@type"]).toBe("SpeakableSpecification");
    expect(speakable.cssSelector).toContain(".fm-faq-answer");
  });
});

describe("speakableSpecificationJsonLd", () => {
  it("emits the given selectors verbatim", () => {
    const o = speakableSpecificationJsonLd([".hero-headline", ".story p"]);
    expect((o.cssSelector as string[])).toEqual([
      ".hero-headline",
      ".story p",
    ]);
  });
});

describe("JSON-LD output is JSON-serializable", () => {
  it("all top-level builders survive JSON.stringify -> parse round-trip", () => {
    const blocks = [
      organizationJsonLd(),
      localBusinessJsonLd(),
      websiteJsonLd("ka"),
      webPageJsonLd({ locale: "en", url: "https://x/en", name: "x" }),
      collectionPageJsonLd({
        locale: "en",
        categorySlug: "sofas",
        name: "Sofas",
        numberOfItems: 1,
      }),
      breadcrumbListJsonLd([{ name: "Home", url: "/" }]),
      itemListJsonLd("sofas", "en", [SAMPLE_PRODUCT]),
      productJsonLd(SAMPLE_PRODUCT_FULL, "en"),
      faqPageJsonLd([{ question: "q", answer: "a" }]),
    ];
    for (const block of blocks) {
      expect(() => JSON.parse(JSON.stringify(block))).not.toThrow();
    }
  });
});
