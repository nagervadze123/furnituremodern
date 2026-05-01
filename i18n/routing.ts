// Defines the locales the site supports and the URL routing strategy.
// Imported by middleware, navigation helpers, layout, and sitemap so that
// all locale logic stays in one place.

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Add locales here when you want to support more languages.
  locales: ["ka", "en"] as const,

  // Georgian is the primary market — visitors with no preference go here.
  defaultLocale: "ka",

  // "always" forces every URL to include the locale prefix (/ka, /en).
  // This is the safest choice for SEO: every page has exactly one canonical
  // URL per locale, and search engines never see duplicate content.
  localePrefix: "always",
});

// Convenience type alias: anywhere you accept a locale param, type it as
// `Locale` so TypeScript knows the only valid values are the ones above.
export type Locale = (typeof routing.locales)[number];
