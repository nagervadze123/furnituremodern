// Single source of truth for site-wide constants.
//
// Every page reads from this file: header/footer copy, SEO metadata,
// JSON-LD generators, the sitemap, opengraph image — all of it.
// Change a phone number or social link here and it propagates everywhere.

import type { Locale } from "@/i18n/routing";

// Read the public site URL from the environment when it is set
// (e.g. in production), otherwise fall back to localhost for dev.
// Centralized here so we never hard-code the URL anywhere else.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// Strip trailing slash so we can safely append paths.
export const SITE_URL = RAW_SITE_URL.replace(/\/$/, "");

// Helper for building absolute URLs from relative paths.
// Always use this instead of string concatenation.
export const absoluteUrl = (path: string): string => {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
};

// Bare host extracted from SITE_URL — used by IndexNow's `host` field
// and by anywhere else that needs the apex domain without protocol.
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "";
  }
})();

// Optional search-engine verification tokens. Each is read from a
// public env var so it can be inlined into the static <head>. Missing
// vars render nothing — never hard-code real tokens here.
export const verificationTokens = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
  yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION || undefined,
} as const;

// Each category has its own slug, route, and short tagline.
// Adding a new category later is just adding an entry here plus
// a matching folder under app/[locale]/.
export const categories = [
  {
    slug: "sofas",
    routeKey: "sofas" as const,
    en: { name: "Sofas", tagline: "Living-room seating, built to last" },
    ka: { name: "დივნები", tagline: "მისაღები ოთახის ხანგრძლივი დივნები" },
  },
  {
    slug: "bedrooms",
    routeKey: "bedrooms" as const,
    en: { name: "Bedrooms", tagline: "Beds, dressers and bedside pieces" },
    ka: { name: "საძინებლები", tagline: "საწოლები, კომოდები და სანათები" },
  },
  {
    slug: "tables-chairs",
    routeKey: "tablesChairs" as const,
    en: { name: "Tables & Chairs", tagline: "Dining and workspace pieces" },
    ka: { name: "მაგიდები და სკამები", tagline: "სასადილო და სამუშაო ნივთები" },
  },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

// Localized category lookup helper.
export const getCategoryName = (slug: CategorySlug, locale: Locale): string => {
  const c = categories.find((x) => x.slug === slug);
  if (!c) throw new Error(`Unknown category: ${slug}`);
  return c[locale].name;
};

// Brand identity tokens used by lib/og/* template renderers when
// composing share-card images. Keep the palette neutral — these values
// drive what the brand looks like on Facebook / X / LinkedIn / WhatsApp,
// so muted-warm-earth reads as a furniture brand rather than a generic
// SaaS gradient. Values marked PLACEHOLDER are confirmed before launch
// in CHECKLIST.md ("Brand identity confirmation").
export const brandTokens = {
  // One short brand line per locale, used as the OG/Twitter subtitle on
  // home and root images. Kept terse so it fits one render line.
  tagline: {
    ka: "ხელნაკეთი ავეჯი თბილისში",
    en: "Handmade modern furniture from Tbilisi",
  },
  // Warm earth accent — matches the existing terracotta band already in
  // the legacy app/opengraph-image.tsx.
  accent: "#b85c38",
  // Off-white render background. Slightly warmer than pure white so the
  // image doesn't read as "default Vercel template".
  background: "#fbf8f3",
  // Deep neutral text. Reads as charcoal on both Slack light and dark.
  foreground: "#28201a",
  // Muted text colour for eyebrows and footer captions.
  muted: "#7a6f5e",
  // 1-2 character monogram fallback used when no logo SVG is present.
  // Derived from the brand name's leading characters.
  logoMonogram: "F",
  // Optional path to a public/ SVG logo for inline use; null when absent.
  logoSvgPath: null as string | null,
} as const;

export type BrandTokens = typeof brandTokens;

// Everything else: brand, contact, social, defaults.
export const siteConfig = {
  name: "Furnituremodern",
  // Short legal/business name used in JSON-LD as @id and Organization name.
  legalName: "Furnituremodern Ltd.",
  // Brand identity tokens for OG/Twitter image generation.
  brand: brandTokens,

  // Used as the default page title fallback and in OG tags.
  shortDescription: {
    en: "Modern, hand-finished furniture from Tbilisi.",
    ka: "თანამედროვე, ხელნაკეთური ავეჯი თბილისიდან.",
  },

  // Longer description used as default meta description on home.
  fullDescription: {
    en: "Furnituremodern designs and builds modern furniture — sofas, bedrooms, dining and workspace pieces — in Tbilisi, Georgia. Solid oak and walnut, natural fabrics, small-batch production.",
    ka: "Furnituremodern ქმნის თანამედროვე ავეჯს — დივნებს, საძინებლებს, სასადილო და სამუშაო ნივთებს — თბილისში. მუხა და კაკალი, ბუნებრივი ქსოვილები, მცირე პარტიული წარმოება.",
  },

  // Real contact info — replace with your actual numbers/addresses.
  contact: {
    email: "hello@furnituremodern.ge",
    phone: "+995 32 200 0000",
    // Used by the LocalBusiness JSON-LD.
    address: {
      street: "Aghmashenebeli Avenue 100",
      city: "Tbilisi",
      region: "Tbilisi",
      postalCode: "0102",
      country: "GE",
    },
    // Approximate Tbilisi coordinates for LocalBusiness/geo.
    geo: { latitude: 41.7151, longitude: 44.8271 },
    // Standard openingHoursSpecification for schema.org.
    openingHours: [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "19:00",
      },
      { days: ["Saturday"], opens: "11:00", closes: "17:00" },
    ],
  },

  // Replace with real profile URLs when you create accounts.
  social: {
    instagram: "https://www.instagram.com/furnituremodern",
    facebook: "https://www.facebook.com/furnituremodern",
  },

  // Default OG image — fully qualified URL. The image itself is generated
  // by app/opengraph-image.tsx. We resolve to an absolute URL here so
  // Next.js never has to resolve a relative path against metadataBase
  // during build (which produces a noisy warning for static metadata
  // route conventions even when metadataBase is set).
  defaultOgImage: `${SITE_URL}/opengraph-image`,

  // Locales the site officially supports. Mirrors i18n/routing.ts so
  // schema generators do not need to import the routing file directly.
  locales: ["ka", "en"] as const,
  defaultLocale: "ka" as const,

  // ISO date of the most recent privacy-policy update. Surfaces on the
  // /privacy page as the "Last updated" line. Update whenever you
  // materially change the policy text.
  privacyPolicyUpdatedAt: "2026-05-02",

  // ---------------------------------------------------------------------------
  // Commerce / structured-data facts
  // ---------------------------------------------------------------------------
  // These shape the LocalBusiness + Product/Offer JSON-LD blocks. Where
  // a value is genuinely unknown today, leave the placeholder marked
  // and confirm before launch (CHECKLIST §"Structured data confirmations").
  // schema.org accepts $ count for priceRange — "$$" reads as "moderate"
  // for a furniture store.
  priceRange: "$$",
  currenciesAccepted: ["GEL"] as const,
  // PLACEHOLDER — confirm with the business before launch.
  paymentAccepted: ["Cash", "CreditCard", "DebitCard", "BankTransfer"] as const,
  areaServed: { country: "GE" as const },

  // schema.org MerchantReturnPolicy. Ships inside every Product offer.
  // PLACEHOLDER values — confirm with the business before launch.
  returnPolicy: {
    applicableCountry: "GE" as const,
    // FiniteReturnWindow + 14 days = standard EU/Georgia distance-selling
    // baseline. Adjust if the business actually accepts longer returns.
    returnPolicyCategory: "MerchantReturnFiniteReturnWindow" as const,
    merchantReturnDays: 14,
    returnMethod: "ReturnByMail" as const,
    returnFees: "FreeReturn" as const,
  },

  // schema.org OfferShippingDetails. Ships inside every Product offer.
  // PLACEHOLDER values — confirm with the business before launch.
  shipping: {
    destinationCountry: "GE" as const,
    rate: { value: 0, currency: "GEL" as const }, // 0 = free shipping placeholder
    deliveryTime: {
      handlingTimeDaysMin: 1,
      handlingTimeDaysMax: 3,
      transitTimeDaysMin: 2,
      transitTimeDaysMax: 7,
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
