// JSON-LD generators (schema.org structured data).
//
// Search engines and AI answer engines (ChatGPT, Perplexity, Google AI
// Overviews) read these blocks to understand the site. Every page that
// can render a relevant block should do so via the <JsonLd> component.
//
// Every builder returns a plain JSON object. We strip undefined/null
// keys via cleanJsonLd() so optional product fields (sku, color,
// material, …) silently disappear from the output instead of
// emitting "key": null which Rich Results validators flag.
//
// @id strategy:
//   • https://domain/#organization
//   • https://domain/#localbusiness
//   • https://domain/#website
//   • https://domain/{locale}#webpage
//   • https://domain/{locale}/{category}#collection
//   • https://domain/{locale}/{category}/{slug}#product
// Stable @ids let WebPage / CollectionPage / Product blocks cross-
// reference Organization and LocalBusiness without redefining them.

import type { Locale } from "@/i18n/routing";
import {
  siteConfig,
  absoluteUrl,
  type CategorySlug,
} from "./site-config";
import type { DataProduct } from "@/lib/data/types";

type Json = Record<string, unknown>;
type JsonValue = unknown;

// schema.org BCP-47 inLanguage codes. Kept here so every builder uses
// the same mapping (rather than each rebuilding from the locale tag).
const INLANG = { ka: "ka-GE", en: "en-US" } as const;
export const inLanguageFor = (locale: Locale): string => INLANG[locale];

// ---------------------------------------------------------------------------
// cleanJsonLd
// Recursively removes undefined and null fields, prunes empty objects /
// arrays. Idiomatic for JSON-LD: a missing key communicates "unknown",
// while a key with null is a validation warning.
// ---------------------------------------------------------------------------
export function cleanJsonLd<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    const out = value
      .map((v) => cleanJsonLd(v))
      .filter((v) => v !== undefined && v !== null);
    return out as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = cleanJsonLd(v);
      if (cleaned === undefined || cleaned === null) continue;
      // Drop empty arrays/objects that pruned themselves.
      if (Array.isArray(cleaned) && cleaned.length === 0) continue;
      if (
        cleaned &&
        typeof cleaned === "object" &&
        !Array.isArray(cleaned) &&
        Object.keys(cleaned as Record<string, unknown>).length === 0
      ) {
        continue;
      }
      out[k] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}

// Anchor URLs we reference from many blocks.
const ID = {
  organization: () => `${absoluteUrl("/")}#organization`,
  localBusiness: () => `${absoluteUrl("/")}#localbusiness`,
  website: () => `${absoluteUrl("/")}#website`,
  webPage: (locale: Locale) => `${absoluteUrl(`/${locale}`)}#webpage`,
  collection: (locale: Locale, slug: string) =>
    `${absoluteUrl(`/${locale}/${slug}`)}#collection`,
  product: (locale: Locale, category: string, slug: string) =>
    `${absoluteUrl(`/${locale}/${category}/${slug}`)}#product`,
} as const;

// ---------------------------------------------------------------------------
// Organization
// Used in the root layout. Tells search engines who runs this site.
// ---------------------------------------------------------------------------
export const organizationJsonLd = (): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID.organization(),
    name: siteConfig.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl(siteConfig.defaultOgImage),
    sameAs: [siteConfig.social.instagram, siteConfig.social.facebook],
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: siteConfig.contact.email,
        telephone: siteConfig.contact.phone,
        contactType: "customer support",
        availableLanguage: ["ka", "en"],
      },
    ],
  });

// ---------------------------------------------------------------------------
// LocalBusiness / FurnitureStore
// Home page. The most-specific schema.org subclass we can claim while
// staying truthful — FurnitureStore extends LocalBusiness.
// ---------------------------------------------------------------------------
export const localBusinessJsonLd = (): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": ID.localBusiness(),
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl(siteConfig.defaultOgImage),
    image: absoluteUrl(siteConfig.defaultOgImage),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    priceRange: siteConfig.priceRange,
    currenciesAccepted: siteConfig.currenciesAccepted.join(", "),
    paymentAccepted: siteConfig.paymentAccepted.join(", "),
    areaServed: {
      "@type": "Country",
      name: siteConfig.areaServed.country,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address.street,
      addressLocality: siteConfig.contact.address.city,
      addressRegion: siteConfig.contact.address.region,
      postalCode: siteConfig.contact.address.postalCode,
      addressCountry: siteConfig.contact.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.contact.geo.latitude,
      longitude: siteConfig.contact.geo.longitude,
    },
    openingHoursSpecification: siteConfig.contact.openingHours.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    })),
    sameAs: [siteConfig.social.instagram, siteConfig.social.facebook],
  });

// ---------------------------------------------------------------------------
// WebSite + SearchAction
// Roots a sitewide search box surface even before the search experience
// is real — crawlers honor the markup once /{locale}/search?q= responds.
// ---------------------------------------------------------------------------
export const websiteJsonLd = (locale: Locale): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID.website(),
    url: absoluteUrl(`/${locale}`),
    name: siteConfig.name,
    description: siteConfig.shortDescription[locale],
    inLanguage: inLanguageFor(locale),
    publisher: { "@id": ID.organization() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(`/${locale}/search`)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });

// ---------------------------------------------------------------------------
// WebPage / CollectionPage
// ---------------------------------------------------------------------------
type WebPageOpts = {
  locale: Locale;
  url: string;
  name: string;
  description?: string;
};
export const webPageJsonLd = ({
  locale,
  url,
  name,
  description,
}: WebPageOpts): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": ID.webPage(locale),
    url,
    name,
    description,
    inLanguage: inLanguageFor(locale),
    isPartOf: { "@id": ID.website() },
    publisher: { "@id": ID.organization() },
  });

type CollectionPageOpts = {
  locale: Locale;
  categorySlug: CategorySlug;
  name: string;
  description?: string;
  numberOfItems: number;
};
export const collectionPageJsonLd = ({
  locale,
  categorySlug,
  name,
  description,
  numberOfItems,
}: CollectionPageOpts): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": ID.collection(locale, categorySlug),
    url: absoluteUrl(`/${locale}/${categorySlug}`),
    name,
    description,
    inLanguage: inLanguageFor(locale),
    isPartOf: { "@id": ID.website() },
    publisher: { "@id": ID.organization() },
    numberOfItems,
  });

// ---------------------------------------------------------------------------
// BreadcrumbList
// ---------------------------------------------------------------------------
export type BreadcrumbItem = { name: string; url: string };

export const breadcrumbListJsonLd = (items: BreadcrumbItem[]): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  });

// ---------------------------------------------------------------------------
// Merchant return policy + shipping (shared between every Product offer)
// ---------------------------------------------------------------------------
const SCHEMA = "https://schema.org";

export const merchantReturnPolicyJsonLd = (): Json =>
  cleanJsonLd({
    "@type": "MerchantReturnPolicy",
    applicableCountry: siteConfig.returnPolicy.applicableCountry,
    returnPolicyCategory: `${SCHEMA}/${siteConfig.returnPolicy.returnPolicyCategory}`,
    merchantReturnDays: siteConfig.returnPolicy.merchantReturnDays,
    returnMethod: `${SCHEMA}/${siteConfig.returnPolicy.returnMethod}`,
    returnFees: `${SCHEMA}/${siteConfig.returnPolicy.returnFees}`,
  });

export const offerShippingDetailsJsonLd = (): Json =>
  cleanJsonLd({
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: siteConfig.shipping.rate.value,
      currency: siteConfig.shipping.rate.currency,
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: siteConfig.shipping.destinationCountry,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: siteConfig.shipping.deliveryTime.handlingTimeDaysMin,
        maxValue: siteConfig.shipping.deliveryTime.handlingTimeDaysMax,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: siteConfig.shipping.deliveryTime.transitTimeDaysMin,
        maxValue: siteConfig.shipping.deliveryTime.transitTimeDaysMax,
        unitCode: "DAY",
      },
    },
  });

// ---------------------------------------------------------------------------
// Product helpers
// ---------------------------------------------------------------------------

// price-valid-until: 90 days out, ISO date (YYYY-MM-DD).
function priceValidUntil(now: Date = new Date()): string {
  const future = new Date(now);
  future.setUTCDate(future.getUTCDate() + 90);
  return future.toISOString().slice(0, 10);
}

// Build the additionalProperty array from optional product fields. We
// emit one PropertyValue per known dimension/weight component so each
// is filterable downstream (Merchant Center, GA4 item params).
function additionalProperties(product: DataProduct): Json[] {
  const out: Json[] = [];
  const dim = product.dimensions;
  const dimUnit = dim?.unitCode ?? "CMT";
  if (dim?.width != null) {
    out.push({
      "@type": "PropertyValue",
      name: "width",
      value: dim.width,
      unitCode: dimUnit,
    });
  }
  if (dim?.height != null) {
    out.push({
      "@type": "PropertyValue",
      name: "height",
      value: dim.height,
      unitCode: dimUnit,
    });
  }
  if (dim?.depth != null) {
    out.push({
      "@type": "PropertyValue",
      name: "depth",
      value: dim.depth,
      unitCode: dimUnit,
    });
  }
  if (product.weight != null) {
    out.push({
      "@type": "PropertyValue",
      name: "weight",
      value: product.weight.value,
      unitCode: product.weight.unitCode ?? "KGM",
    });
  }
  return out;
}

function offerJsonLd(
  product: DataProduct,
  locale: Locale,
  url: string,
  now: Date = new Date()
): Json {
  const availability = `${SCHEMA}/${product.availability ?? "InStock"}`;
  const condition = `${SCHEMA}/${product.condition ?? "NewCondition"}`;
  return cleanJsonLd({
    "@type": "Offer",
    url,
    price: product.price,
    priceCurrency: product.currency,
    priceValidUntil: priceValidUntil(now),
    availability,
    itemCondition: condition,
    seller: { "@id": ID.localBusiness() },
    hasMerchantReturnPolicy: merchantReturnPolicyJsonLd(),
    shippingDetails: offerShippingDetailsJsonLd(),
    inLanguage: inLanguageFor(locale),
  });
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export const productJsonLd = (
  product: DataProduct,
  locale: Locale,
  now: Date = new Date()
): Json => {
  const canonicalUrl = absoluteUrl(
    `/${locale}/${product.category}/${product.slug}`
  );
  const props = additionalProperties(product);

  return cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": ID.product(locale, product.category, product.slug),
    url: canonicalUrl,
    name: product.name[locale],
    description: product.description[locale],
    image: product.images.map((img) => img.url),
    sku: product.sku ?? product.id,
    mpn: product.mpn,
    category: product.category,
    color: product.color,
    material: product.material,
    brand: {
      "@type": "Brand",
      name: product.brand ?? siteConfig.name,
    },
    additionalProperty: props.length > 0 ? props : undefined,
    inLanguage: inLanguageFor(locale),
    isPartOf: { "@id": ID.collection(locale, product.category) },
    offers: offerJsonLd(product, locale, canonicalUrl, now),
  });
};

// Mini Product node used inside the category ItemList.
function miniProductJsonLd(product: DataProduct, locale: Locale): Json {
  const canonicalUrl = absoluteUrl(
    `/${locale}/${product.category}/${product.slug}`
  );
  return cleanJsonLd({
    "@type": "Product",
    "@id": ID.product(locale, product.category, product.slug),
    name: product.name[locale],
    image: product.images[0]?.url,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: product.brand ?? siteConfig.name,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      price: product.price,
      priceCurrency: product.currency,
      availability: `${SCHEMA}/${product.availability ?? "InStock"}`,
    },
  });
}

// ---------------------------------------------------------------------------
// ItemList
// Used on category pages. Each list item links to the full Product
// detail URL (not a fragment) — fragment links were a 2019-era pattern
// before per-product pages existed.
//
// Takes the category name + tagline directly because the source of
// truth moved to Supabase in Phase 5 Task 3; the caller has the row
// loaded already, so we don't re-query inside the JSON-LD builder.
// ---------------------------------------------------------------------------
export type ItemListJsonLdOpts = {
  categorySlug: CategorySlug;
  locale: Locale;
  name: string;
  description?: string;
  products: DataProduct[];
};

export const itemListJsonLd = ({
  categorySlug,
  locale,
  name,
  description,
  products,
}: ItemListJsonLdOpts): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl(`/${locale}/${categorySlug}`)}#itemlist`,
    name,
    description,
    url: absoluteUrl(`/${locale}/${categorySlug}`),
    numberOfItems: products.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/${locale}/${product.category}/${product.slug}`),
      item: miniProductJsonLd(product, locale),
    })),
  });

// ---------------------------------------------------------------------------
// FAQPage + SpeakableSpecification
// ---------------------------------------------------------------------------
export type FaqItem = { question: string; answer: string };

export const faqPageJsonLd = (items: FaqItem[]): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".fm-faq-answer"],
    },
  });

// Standalone Speakable block — emit on pages where a different element
// should be read aloud (hero subtitle, key product copy, etc.). Pass
// the css selectors that point at user-visible text only.
export const speakableSpecificationJsonLd = (cssSelectors: string[]): Json =>
  cleanJsonLd({
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    cssSelector: cssSelectors,
  });
