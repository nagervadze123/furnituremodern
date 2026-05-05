// Single source of truth for site-wide constants.
//
// Every page reads from this file: header/footer copy, SEO metadata,
// JSON-LD generators, the sitemap, opengraph image — all of it.
// Change a phone number or social link here and it propagates everywhere.

// Locale type previously imported here to type the now-removed
// getCategoryName helper. Kept for reference — Phase 5 Task 3 made
// categories Supabase-backed, so the helper has no callers.

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

// Offline-only fallback for the catalog category list.
//
// Phase 5 Task 3 moved the source of truth into Supabase (`categories`
// table — slug, name_ka/en, description_ka/en, intro_ka/en,
// sort_order, is_featured_in_nav, is_deleted). The array below is read
// ONLY when `isSupabaseConfigured()` is false — i.e. CI builds without
// `.env.local`, the local TS-fallback dev mode, and tests that pre-date
// a Supabase fixture.
//
// Production reads from Supabase; the data layer never substitutes this
// array on a query failure (it returns an empty list and lets the page
// render a controlled empty state).
//
// To add a real category in production: create the row in `/admin/categories`.
// To add an offline-only category for dev work: append an entry here.
export const categories = [
  {
    slug: "sofas",
    en: {
      name: "Sofas",
      tagline: "Living-room seating, built to last",
      intro:
        "Our sofa collection is built for daily living. Frames are kiln-dried solid oak; suspension uses 8-way hand-tied springs; cushions have a separate down-and-feather core inside a moisture-wicking ticking. Covers are removable, dry-cleanable, and replaceable so the sofa you buy today can be reupholstered ten years from now.",
    },
    ka: {
      name: "დივნები",
      tagline: "მისაღები ოთახის ხანგრძლივი დივნები",
      intro:
        "ჩვენი დივნების კოლექცია შექმნილია ყოველდღიური ცხოვრებისთვის. ჩარჩოები არის ნახარშავი მუხის ხისგან, ფუძე იყენებს 8-მხრივი ხელით შეკრულ ზამბარებს, ხოლო ყოველ ბალიშს აქვს ცალკე ფუმფულას ფენა. შესამოსი მოსახსნელი და ცვლადია.",
    },
  },
  {
    slug: "bedrooms",
    en: {
      name: "Bedrooms",
      tagline: "Beds, dressers and bedside pieces",
      intro:
        "The bedroom collection focuses on the pieces you actually need: a low platform bed, a roomy dresser, a generous wardrobe, and the small companions. Frames are solid white oak or European walnut, joined with traditional mortise-and-tenon construction.",
    },
    ka: {
      name: "საძინებლები",
      tagline: "საწოლები, კომოდები და სანათები",
      intro:
        "საძინებლის კოლექცია ფოკუსირებულია იმ ნივთებზე, რომლებიც ნამდვილად გჭირდებათ: დაბალი პლატფორმის საწოლი, ფართო კომოდი, ვიწრო გარდერობი და გვერდითი ნივთები. ჩარჩოები არის თეთრი მუხა ან ევროპული კაკალი, ტრადიციული შეერთებებით.",
    },
  },
  {
    slug: "tables-chairs",
    en: {
      name: "Tables & Chairs",
      tagline: "Dining and workspace pieces",
      intro:
        "Tables and chairs are the pieces a household uses most, so we make them most carefully. Dining tables come in solid oak or walnut; the round pedestal version sits four, the rectangular six. Wishbone-back dining chairs use steam-bent oak frames and hand-woven paper-cord seats.",
    },
    ka: {
      name: "მაგიდები და სკამები",
      tagline: "სასადილო და სამუშაო ნივთები",
      intro:
        "მაგიდები და სკამები არის ის ნივთები, რომლებსაც ოჯახი ყველაზე ხშირად იყენებს. სასადილო მაგიდები იწარმოება ბუნებრივი მუხისგან ან კაკლისგან; მრგვალი ფუძის ვერსია ეტევა ოთხს, ოთხკუთხა — ექვსს.",
    },
  },
] as const;

/**
 * Category slug type. Now an alias for `string` — the live source of
 * truth is the Supabase `categories` table (Phase 5 Task 3). Legacy
 * call sites keep the named import so we don't have to rewrite every
 * function signature; new code can use `string` directly.
 */
export type CategorySlug = string;

// Brand identity tokens used by lib/og/* template renderers when
// composing share-card images. Keep the palette neutral — these values
// drive what the brand looks like on Facebook / X / LinkedIn / WhatsApp,
// so muted-warm-earth reads as a furniture brand rather than a generic
// SaaS gradient. Values marked PLACEHOLDER are confirmed before launch
// in CHECKLIST.md ("Brand identity confirmation").
//
// Phase 4 Task 4 (accessibility) contrast audit — measured ratios on
// the documented sRGB hex values, computed via the WCAG 2.x relative
// luminance formula:
//   • foreground #28201a on background #fbf8f3        → 15.1:1  ✅ AAA body
//   • muted      #7a6f5e on background #fbf8f3        →  4.7:1  ✅ AA body  / ⚠️ AAA fails (target 7:1)
//   • accent     #b85c38 on background #fbf8f3        →  4.3:1  ⚠️ AA body fails (target 4.5:1) / ✅ AA large
//   • background #fbf8f3 on accent     #b85c38        →  4.3:1  ⚠️ same — accent CTA white-on-terracotta
//
// The accent and muted shortfalls are kept against the operator's
// brand identity. Treatment in the live UI:
//   • Accent (oklch ≈ same hex) is used as the focus-ring color and
//     OG-card decoration band — both NON-TEXT uses where 3:1 is the
//     WCAG floor; the 4.3:1 ratio passes that comfortably.
//   • Accent is NOT used as a body-text color anywhere in the runtime
//     UI. If an accent CTA is added, the white-on-accent ratio fails
//     AA body and must use AA-large sizing (≥18pt or ≥14pt bold).
//   • Muted text appears in eyebrows, footer captions, and form hints —
//     none of which are the primary reading text. WCAG body 7:1 AAA is
//     a stretch goal here; AA 4.5:1 is the floor and we sit above it.
//
// Tightened replacement candidates (NOT applied — operator confirms):
//   • Accent darkened to #9a4a25 hits 6.0:1 on background, AA body pass.
//   • Accent darkened to #7d3a18 hits ~8:1, AAA pass.
//   • Muted darkened to #5a4f3f hits ~7.1:1, AAA pass.
// See CHECKLIST.md "Brand identity confirmation" for the operator
// decision row.
export const brandTokens = {
  // One short brand line per locale, used as the OG/Twitter subtitle on
  // home and root images. Kept terse so it fits one render line.
  tagline: {
    ka: "ხელნაკეთი ავეჯი თბილისში",
    en: "Handmade modern furniture from Tbilisi",
  },
  // Warm earth accent — matches the existing terracotta band already in
  // the legacy app/opengraph-image.tsx. Phase 5b editorial palette uses
  // this as `terracotta-500`; unchanged.
  accent: "#b85c38",
  // Phase 5b editorial palette → `bone-50`. Slightly warmer than the
  // previous #fbf8f3 (more chroma in the warm direction). Foreground is
  // `ink-900` from the same palette (#1c1816, was #28201a — slightly
  // deeper). Both surface in `--background` / `--foreground` and on
  // every OG/Twitter card.
  background: "#faf7f2",
  foreground: "#1c1816",
  // Muted text colour for eyebrows and footer captions.
  muted: "#7a6f5e",
  // 1-2 character monogram fallback used when no logo SVG is present.
  // Derived from the brand name's leading characters.
  logoMonogram: "F",
  // Optional path to a public/ SVG logo for inline use; null when absent.
  logoSvgPath: null as string | null,

  // Phase 5 design system additions. Both PLACEHOLDER until Phase 5
  // copy / catalogue work supplies real values; see CHECKLIST.md
  // "Brand identity confirmation" for operator follow-ups.
  //
  // PLACEHOLDER — credit string used by Phase 5.4's hero (e.g.
  // "Photo: Studio Tbilisi"). Empty string when no credit needs to
  // appear on the rendered hero. Phase 5 Task 4 also populates
  // `heroImage.credit` below with a stock photographer credit; this
  // field stays for the hand-curated launch hero.
  heroLandingPhotoCredit: "" as string,
  // PLACEHOLDER — operator's flagship product slug, used by Phase 5.5
  // home-page hero CTA to deep-link into the showcase product. Set to
  // a real slug from the catalogue before launch; null falls back to
  // the first featured product.
  signatureProductSlug: null as string | null,

  // PLACEHOLDER — Phase 5b "featured collection" editorial moment on
  // the home page (`components/home/FeaturedCollection.tsx`). When set
  // to a real product slug, the home page renders a single large image
  // + display headline + 50-word prose. When null (default), the entire
  // section is omitted — the home page does not render an empty
  // placeholder. The matching i18n keys live under home.featured_collection.
  featuredProductSlug: null as string | null,

  // Phase 5 Task 4 — cinematic 21:9 lifestyle hero shot for the home
  // page, sourced from Unsplash/Pexels. Replace `url` with a real
  // operator-shot frame before launch. Consumed by the Phase 5.5 home
  // hero redesign. `url` is a relative storage key inside the
  // `product-images` bucket so the same path works across environments;
  // the consuming component prepends ${NEXT_PUBLIC_SUPABASE_URL}.
  heroImage: {
    storageKey: "stock/hero-home-default.jpg",
    alt: {
      ka: "მოდუნებული საცხოვრებელი ოთახი დივანითა და ხის ავეჯით",
      en: "Relaxed living room with sofa and timber furniture",
    },
    // Operator-facing credit, e.g. "Photo: Jane Doe / Unsplash". Empty
    // string until the manifest entry is finalised; the data layer
    // surfaces the credit only when this field is non-empty.
    credit: "" as string,
  },
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
