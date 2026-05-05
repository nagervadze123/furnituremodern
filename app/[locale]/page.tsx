// Home page — route: /ka or /en
//
// Phase 5b editorial composition:
//   1. Hero               — 12-col editorial grid, text left + 4/5 portrait
//                            right. No overlay; static reveal.
//   2. EyebrowNav         — magazine-masthead strip (Collection · Workshop
//                            · Contact) with hairline borders.
//   3. FeaturedCategories — 3-row alternating image/text editorial layout.
//   4. FeaturedCollection — single "in focus" moment (operator-controlled
//                            via siteConfig.brand.featuredProductSlug;
//                            section omitted entirely when null).
//   5. SignatureProducts  — 8 most-recent published products (emits
//                            home-only ItemList JSON-LD).
//   6. BrandStory         — 60/40 image + prose with subtle parallax.
//                            Section anchor #workshop.
//   7. VisitStrip         — deep-ink inversion band, mailto CTA.
//                            Section anchor #visit.
//   8. AeoSummaryPanel    — preserved (factual summary for AI crawlers).
//   9. Faq                — preserved + emits FAQPage rich result.
//
// All home/* sections are server components; lib/motion ships its own
// "use client" wrappers (Reveal / RevealStagger / Parallax) where the
// scroll-driven animations need to run on the client.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { EyebrowNav } from "@/components/home/EyebrowNav";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { FeaturedCollection } from "@/components/home/FeaturedCollection";
import { SignatureProducts } from "@/components/home/SignatureProducts";
import { BrandStory } from "@/components/home/BrandStory";
import { VisitStrip } from "@/components/home/VisitStrip";
import { Faq } from "@/components/sections/faq";
import { JsonLd } from "@/components/json-ld";
import { AeoSummaryPanel } from "@/components/sections/aeo-summary";
import {
  localBusinessJsonLd,
  faqPageJsonLd,
  webPageJsonLd,
} from "@/lib/schema";
import { getFaqEntries } from "@/content/faq";
import { homeAeoSummary } from "@/lib/aeo/summary";
import { getCategories } from "@/lib/data/categories";
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

  // Per-locale OG / Twitter image URLs. The opengraph-image and
  // twitter-image route handlers under app/[locale]/ render branded
  // cards in the visitor's language; pointing the metadata directly at
  // those URLs (rather than relying on Next's auto-wire) survives the
  // per-field replacement Next applies when a page sets openGraph.
  const ogImage = absoluteUrl(`/${locale}/opengraph-image`);
  const twitterImage = absoluteUrl(`/${locale}/twitter-image`);
  const twitterImageSquare = absoluteUrl(`/${locale}/twitter-image-square`);
  const otherLocale = routing.locales.find((l) => l !== locale);

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
      alternateLocale: otherLocale
        ? [otherLocale === "ka" ? "ka_GE" : "en_US"]
        : undefined,
      // Re-stating the OG image and site name here because Next.js
      // replaces the parent's openGraph entirely when a child returns
      // its own — there is no automatic per-field merge.
      siteName: siteConfig.name,
      images: [
        { url: ogImage, width: 1200, height: 630 },
        { url: twitterImageSquare, width: 600, height: 600 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description,
      images: [twitterImage, twitterImageSquare],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const [t, cats] = await Promise.all([
    getTranslations("home"),
    getCategories(locale),
  ]);
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
      <EyebrowNav />
      <FeaturedCategories />
      <FeaturedCollection />
      <SignatureProducts />
      <BrandStory />
      <VisitStrip />
      <AeoSummaryPanel summary={homeAeoSummary(locale, cats)} id="aeo-home" />
      <Faq title={t("faqTitle")} items={faqEntries} />
    </>
  );
}
