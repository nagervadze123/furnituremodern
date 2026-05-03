// SEO helpers used by every page.
// Keeps the metadata shape consistent so different pages can never
// drift in subtle ways (different hreflang sets, missing canonical, etc.).

import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site-config";
import { routing, type Locale } from "@/i18n/routing";

type CategoryMetadataInput = {
  locale: Locale;
  // Path relative to the locale root, e.g. "sofas". Use "" for the home page.
  path: string;
  title: string;
  description: string;
};

/** Map a Locale to its OpenGraph BCP-47 region tag. */
function ogLocale(locale: Locale): string {
  return locale === "ka" ? "ka_GE" : "en_US";
}

/** The other locale, formatted as openGraph.alternateLocale expects. */
function ogAlternateLocales(locale: Locale): string[] {
  return routing.locales
    .filter((l) => l !== locale)
    .map((l) => ogLocale(l));
}

// Build a Metadata object with: canonical URL, hreflang alternates for
// every supported locale + x-default, OpenGraph, Twitter card.
//
// Use this from generateMetadata() in any page.tsx.
export function buildCategoryMetadata({
  locale,
  path,
  title,
  description,
}: CategoryMetadataInput): Metadata {
  // Normalize: "/sofas" or "" → "/sofas" or "" with leading slash.
  const cleanPath = path.startsWith("/") ? path : path ? `/${path}` : "";

  const canonical = absoluteUrl(`/${locale}${cleanPath}`);
  // hreflang alternates: one for each locale + x-default pointing to the
  // default locale's version. Without x-default, search engines may not
  // know which version to show users in unsupported languages.
  const languages = Object.fromEntries([
    ...routing.locales.map((l) => [l, absoluteUrl(`/${l}${cleanPath}`)]),
    ["x-default", absoluteUrl(`/${siteConfig.defaultLocale}${cleanPath}`)],
  ]);

  // Per-route OG / Twitter image URLs. Pointing here (rather than the
  // root /opengraph-image) lets the per-segment ImageResponse handlers
  // produce branded, data-driven cards. The square variants are listed
  // alongside the 1200×630 one so platforms that prefer a square tile
  // (LinkedIn newer cards, some WhatsApp previews) have both.
  const ogImage = absoluteUrl(`/${locale}${cleanPath}/opengraph-image`);
  const twitterImage = absoluteUrl(`/${locale}${cleanPath}/twitter-image`);
  const twitterImageSquare = absoluteUrl(
    `/${locale}${cleanPath}/twitter-image-square`
  );

  return {
    // Repeated on every page (alongside the layout) because Next.js
    // doesn't reliably propagate metadataBase from a static layout
    // metadata export down into pages that use generateMetadata().
    metadataBase: new URL(absoluteUrl("/")),
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      siteName: siteConfig.name,
      // Re-state images here because Next.js's per-field merge replaces
      // the parent's openGraph entirely when a child returns its own.
      images: [
        { url: ogImage, width: 1200, height: 630 },
        { url: twitterImageSquare, width: 600, height: 600 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twitterImage, twitterImageSquare],
    },
  };
}
