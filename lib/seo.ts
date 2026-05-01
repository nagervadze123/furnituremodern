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
      locale: locale === "ka" ? "ka_GE" : "en_US",
      // Re-state images here because Next.js's per-field merge replaces
      // the parent's openGraph entirely when a child returns its own.
      siteName: siteConfig.name,
      images: [siteConfig.defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.defaultOgImage],
    },
  };
}
