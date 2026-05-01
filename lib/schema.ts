// JSON-LD generators (schema.org structured data).
//
// Search engines and AI answer engines (ChatGPT, Perplexity, Google AI
// Overviews) read these blocks to understand the site. Every page that
// can render a relevant block should do so via the <JsonLd> component.
//
// We intentionally type these loosely as `Record<string, unknown>`:
// schema.org accepts open-ended JSON, and stricter typing would create
// friction without adding real safety.

import type { Locale } from "@/i18n/routing";
import {
  siteConfig,
  absoluteUrl,
  categories,
  type CategorySlug,
} from "./site-config";
import type { DataProduct } from "@/lib/data/types";

type Json = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Organization
// Used in the root layout. Tells search engines who runs this site.
// ---------------------------------------------------------------------------
export const organizationJsonLd = (): Json => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${absoluteUrl("/")}#organization`,
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
// LocalBusiness
// Used on the home page (and a future /contact page). Tells Google we
// are a real shop with an address and opening hours.
// ---------------------------------------------------------------------------
export const localBusinessJsonLd = (): Json => ({
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  "@id": `${absoluteUrl("/")}#localbusiness`,
  name: siteConfig.name,
  url: absoluteUrl("/"),
  image: absoluteUrl(siteConfig.defaultOgImage),
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
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
});

// ---------------------------------------------------------------------------
// WebSite
// Used in the root layout. Includes a SearchAction so Google can later
// surface a sitelinks search box. The /search?q= URL is a placeholder —
// implement /search later and the markup is already correct.
// ---------------------------------------------------------------------------
export const websiteJsonLd = (locale: Locale): Json => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${absoluteUrl("/")}#website`,
  url: absoluteUrl(`/${locale}`),
  name: siteConfig.name,
  description: siteConfig.shortDescription[locale],
  inLanguage: locale,
  publisher: { "@id": `${absoluteUrl("/")}#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${absoluteUrl(`/${locale}`)}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

// ---------------------------------------------------------------------------
// BreadcrumbList
// Used on every non-home page so crawlers understand site hierarchy.
// ---------------------------------------------------------------------------
export type BreadcrumbItem = { name: string; url: string };

export const breadcrumbListJsonLd = (items: BreadcrumbItem[]): Json => ({
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
// ItemList
// Used on category pages to list products. This is what makes a
// "list of sofas" eligible for rich results.
// ---------------------------------------------------------------------------
export const itemListJsonLd = (
  categorySlug: CategorySlug,
  locale: Locale,
  products: DataProduct[]
): Json => {
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) throw new Error(`Unknown category: ${categorySlug}`);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category[locale].name,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/${locale}/${categorySlug}#${product.slug}`),
      name: product.name[locale],
    })),
  };
};

// ---------------------------------------------------------------------------
// Product
// Ready for individual product pages once you build them. Returns a
// fully-formed Product schema with offers (price + currency + availability).
// ---------------------------------------------------------------------------
export const productJsonLd = (product: DataProduct, locale: Locale): Json => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name[locale],
  description: product.description[locale],
  image: product.images.map((img) => img.url),
  sku: product.id,
  brand: {
    "@type": "Brand",
    name: siteConfig.name,
  },
  offers: {
    "@type": "Offer",
    price: product.price,
    priceCurrency: product.currency,
    availability: "https://schema.org/InStock",
    url: absoluteUrl(`/${locale}/${product.category}#${product.slug}`),
  },
});

// ---------------------------------------------------------------------------
// FAQPage
// Used on the home page. Each Q&A becomes a Question/Answer node.
// AI answer engines pull from this format heavily.
// ---------------------------------------------------------------------------
export type FaqItem = { question: string; answer: string };

export const faqPageJsonLd = (items: FaqItem[]): Json => ({
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
});
