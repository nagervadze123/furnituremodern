// Phase 5b "in focus" editorial moment.
//
// A single, attention-commanding band between FeaturedCategories and
// SignatureProducts. The operator picks one product to surface; if no
// product is selected the entire section is omitted (we don't render
// an empty placeholder).
//
// Operator wiring:
//   • `siteConfig.brand.featuredProductSlug` is the source of truth.
//     When null (default), <FeaturedCollection /> returns null.
//   • i18n strings live under `home.featured_collection` so copy can
//     be tuned per locale without code changes.
//
// Layout — bone-100 background (one shade up from the page bone-50,
// gives the section a deliberate visual stop), py-44 desktop / py-24
// mobile, max-w-4xl mx-auto. Inside:
//   • Eyebrow + display-2 headline
//   • AspectImage 16/9, max-w-3xl centered, hairline bone-200 border
//   • body-lg prose (~50 words) from i18n
//   • Anchor link "View piece →" deep-linking into the catalogue
//
// Image source priority:
//   1. The product's primary image (resolved via getProductBySlug)
//   2. /icon.svg if Supabase isn't configured (offline / CI)

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  AspectFrame,
  Body,
  Container,
  EditorialHeading,
  Eyebrow,
  Section,
} from "@/components/design";
import { BRAND_LANDSCAPE_BLUR } from "@/lib/perf/blur";
import { getProductBySlug } from "@/lib/data/products";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

export async function FeaturedCollection() {
  const slug = siteConfig.brand.featuredProductSlug;
  if (!slug) return null;

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("home.featured_collection");

  // Look up the product. If it's gone (renamed, soft-deleted, or never
  // existed), don't render — surfacing a broken link from a marquee
  // section is worse than skipping the section.
  const product = await getProductBySlug(slug, locale);
  if (!product) return null;

  const primaryImage = product.images[0];
  const imageSrc = primaryImage?.url ?? "/icon.svg";
  const imageAlt = primaryImage?.alt[locale] ?? t("image_alt");
  const isFallbackSvg = imageSrc.endsWith(".svg");

  const productHref = `/${product.category}/${product.slug}`;

  return (
    <Section
      // `id="featured"` is the IssueRibbon's "II. Featured" anchor
      // target. Phase 5b had no in-page anchor here; Phase 6 Slice 2
      // wires this section into the home masthead TOC.
      id="featured"
      aria-labelledby="featured-collection-heading"
      className="bg-[var(--color-bone-100)] py-24 md:py-44"
    >
      <Container variant="default" className="max-w-4xl">
        <div className="flex flex-col items-center gap-8 text-center">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <EditorialHeading
            id="featured-collection-heading"
            variant={2}
            as="h2"
            className="max-w-3xl break-words"
          >
            {t.rich("heading", {
              em: (chunks) => <em>{chunks}</em>,
            })}
          </EditorialHeading>

          <div className="w-full max-w-3xl">
            <AspectFrame ratio="16/9" className="bg-[var(--color-bone-50)]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                placeholder={isFallbackSvg ? undefined : "blur"}
                blurDataURL={isFallbackSvg ? undefined : BRAND_LANDSCAPE_BLUR}
                unoptimized={isFallbackSvg}
                className="object-cover"
              />
            </AspectFrame>
          </div>

          <Body
            variant="lg"
            className="max-w-2xl text-[var(--color-ink-700)]"
          >
            {t("body")}
          </Body>

          <Link
            href={productHref}
            className="mt-2 inline-flex items-center text-sm font-medium text-[var(--color-ink-900)] transition-colors duration-300 hover:text-[var(--color-terracotta-600)] focus-visible:outline-none focus-visible:text-[var(--color-terracotta-600)]"
          >
            {t("cta")}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
