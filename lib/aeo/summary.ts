// Visible factual-summary helpers for home + category pages.
//
// These produce short paragraphs that match real, visible business
// facts (no keyword stuffing, no cloaking). The same content is also
// echoed in /llms.txt and /llms-full.txt so AI crawlers see the
// same claims as human readers.

import { siteConfig, categories } from "@/lib/site-config";
import type { CategorySlug } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

export type FactPair = { label: string; value: string };

export type AeoSummary = {
  heading: string;
  paragraph: string;
  facts: FactPair[];
};

const HOME_HEADING = {
  ka: "მოკლე მიმოხილვა",
  en: "At a glance",
} as const;

const CATEGORY_HEADING = {
  ka: "მოკლე მიმოხილვა",
  en: "At a glance",
} as const;

// The home paragraph mixes brand → location → catalog → languages so
// a single read tells a crawler / assistant who and where we are. We
// don't make this paragraph long; depth lives in /llms-full.txt and
// the visible category intros.
export function homeAeoSummary(locale: Locale): AeoSummary {
  const cityCountry = `${siteConfig.contact.address.city}, ${siteConfig.contact.address.country}`;
  const categoryNames = categories.map((c) => c[locale].name).join(", ");

  if (locale === "ka") {
    return {
      heading: HOME_HEADING.ka,
      paragraph: `${siteConfig.name} — თბილისში დაფუძნებული ავეჯის სტუდია. ვამზადებთ თანამედროვე ავეჯს მცირე პარტიებად: ${categoryNames}. ვემსახურებით საქართველოს მასშტაბით, მოქმედებს როგორც ქართული, ასევე ინგლისური მხარდაჭერა.`,
      facts: [
        { label: "ბრენდი", value: siteConfig.name },
        { label: "მდებარეობა", value: cityCountry },
        { label: "მომსახურების არეალი", value: siteConfig.areaServed.country },
        { label: "კატეგორიები", value: categoryNames },
        { label: "ენები", value: "ქართული, English" },
      ],
    };
  }

  return {
    heading: HOME_HEADING.en,
    paragraph: `${siteConfig.name} is a Tbilisi-based furniture studio building modern, small-batch pieces across ${categoryNames}. We serve customers across Georgia and provide both Georgian and English support.`,
    facts: [
      { label: "Brand", value: siteConfig.name },
      { label: "Location", value: cityCountry },
      { label: "Service area", value: siteConfig.areaServed.country },
      { label: "Categories", value: categoryNames },
      { label: "Languages", value: "Georgian, English" },
    ],
  };
}

// Per-category summary. We don't fabricate materials or ranges — they
// come straight from the category-intros copy and from siteConfig.
export function categoryAeoSummary(
  slug: CategorySlug,
  locale: Locale,
  numberOfItems: number
): AeoSummary {
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw new Error(`Unknown category: ${slug}`);
  const cityCountry = `${siteConfig.contact.address.city}, ${siteConfig.contact.address.country}`;
  const name = category[locale].name;

  if (locale === "ka") {
    return {
      heading: CATEGORY_HEADING.ka,
      paragraph: `${name} — ${siteConfig.name}-ის კატეგორია. დამზადებულია ${cityCountry}-ში, ხელნაკეთური ხარისხით. კატალოგში ${numberOfItems} ნივთი.`,
      facts: [
        { label: "კატეგორია", value: name },
        { label: "ბრენდი", value: siteConfig.name },
        { label: "ნივთების რაოდენობა", value: String(numberOfItems) },
        { label: "მდებარეობა", value: cityCountry },
        { label: "მომსახურების არეალი", value: siteConfig.areaServed.country },
      ],
    };
  }

  return {
    heading: CATEGORY_HEADING.en,
    paragraph: `${name} is a category from ${siteConfig.name}, made by hand in ${cityCountry}. ${numberOfItems} ${numberOfItems === 1 ? "item" : "items"} in the catalogue.`,
    facts: [
      { label: "Category", value: name },
      { label: "Brand", value: siteConfig.name },
      { label: "Item count", value: String(numberOfItems) },
      { label: "Location", value: cityCountry },
      { label: "Service area", value: siteConfig.areaServed.country },
    ],
  };
}

// "Last updated" formatter for visible <time> elements. Uses
// Intl.DateTimeFormat with the locale variant we've been using
// elsewhere (ka-GE, en-US).
export function formatLastUpdated(iso: string, locale: Locale): string {
  const lang = locale === "ka" ? "ka-GE" : "en-US";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export const LAST_UPDATED_LABEL = {
  ka: "ბოლო განახლება",
  en: "Last updated",
} as const;
