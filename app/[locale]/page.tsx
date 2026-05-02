// Home page — route: /ka or /en

import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { FeaturedCategories } from "@/components/sections/featured-categories";
import { BrandStory } from "@/components/sections/brand-story";
import { Faq } from "@/components/sections/faq";
import { JsonLd } from "@/components/json-ld";
import {
  localBusinessJsonLd,
  faqPageJsonLd,
  webPageJsonLd,
} from "@/lib/schema";
import { getFaqEntries } from "@/content/faq";
import { siteConfig, absoluteUrl } from "@/lib/site-config";
import { routing, type Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

// Per-page metadata. Title falls back to siteConfig.name (the layout
// template inserts " — Furnituremodern" automatically for child pages,
// but on the home page we want JUST the brand name.)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const description = siteConfig.fullDescription[locale];

  return {
    // metadataBase is repeated here (also set in the layout) so Next.js
    // can always resolve relative OG/Twitter image URLs even when the
    // layout's static metadata isn't merged into a page's
    // generateMetadata() result.
    metadataBase: new URL(absoluteUrl("/")),
    // `absolute` opts out of the parent's title template so we get a
    // clean root title instead of "Home — Furnituremodern".
    title: { absolute: siteConfig.name },
    description,
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      // hreflang tags — one per supported locale + an x-default fallback.
      languages: Object.fromEntries([
        ...routing.locales.map((l) => [l, absoluteUrl(`/${l}`)]),
        ["x-default", absoluteUrl(`/${siteConfig.defaultLocale}`)],
      ]),
    },
    openGraph: {
      type: "website",
      url: absoluteUrl(`/${locale}`),
      title: siteConfig.name,
      description,
      locale: locale === "ka" ? "ka_GE" : "en_US",
      // Re-stating the OG image and site name here because Next.js
      // replaces the parent's openGraph entirely when a child returns
      // its own — there is no automatic per-field merge.
      siteName: siteConfig.name,
      images: [siteConfig.defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description,
      images: [siteConfig.defaultOgImage],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const faqEntries = getFaqEntries(locale);
  // Per-request CSP nonce, threaded into every inline <script> tag.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      {/* Page-specific structured data. Organization + WebSite already
          live in the layout. WebPage anchors the home @id graph;
          LocalBusiness + FAQPage are home-only. */}
      <JsonLd
        id="ld-webpage"
        data={webPageJsonLd({
          locale,
          url: absoluteUrl(`/${locale}`),
          name: siteConfig.name,
          description: siteConfig.fullDescription[locale],
        })}
        nonce={nonce}
      />
      <JsonLd id="ld-localbusiness" data={localBusinessJsonLd()} nonce={nonce} />
      <JsonLd id="ld-faq" data={faqPageJsonLd(faqEntries)} nonce={nonce} />

      <Hero />
      <FeaturedCategories />
      <BrandStory />
      <Faq title={t("faqTitle")} items={faqEntries} />
    </>
  );
}
