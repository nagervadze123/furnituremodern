// Per-category OpenGraph image — auto-wired at
// /[locale]/[category]/opengraph-image. Reads category data via the
// same data-layer helper the page uses, so the unfurled card always
// matches what the page renders (single source of truth).
//
// Runtime: Node + force-static. The data layer is server-only and the
// (locale, category) tuples are bounded — pre-rendering at build time
// keeps the CDN warm for every social platform.

import { notFound } from "next/navigation";

import {
  getCategories,
  getCategoryBySlug,
} from "@/lib/data/categories";
import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildCategoryTemplate,
  OG_DIMENSIONS,
  renderOgResponse,
  shortenIntro,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";
export const size = OG_DIMENSIONS;
export const contentType = "image/png";
export const alt = `${siteConfig.name} — category`;

export async function generateStaticParams() {
  const categories = await getCategories();
  return routing.locales.flatMap((locale) =>
    categories.map((c) => ({ locale, category: c.slug }))
  );
}

const CATEGORY_EYEBROW = { ka: "კატეგორია", en: "Category" } as const;

type Props = { params: Promise<{ locale: string; category: string }> };

export default async function Image({ params }: Props) {
  const { locale: raw, category } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  const row = await getCategoryBySlug(category, locale);
  if (!row) notFound();

  // Use the row's intro_ka/en (Phase 5 Task 3); fall back to the
  // tagline if intro is empty so we always have something to render.
  const categoryName = row.name[locale];
  const introSource = row.intro[locale]?.trim() || row.description[locale];
  const introExcerpt = shortenIntro(introSource, 90);

  return renderOgResponse(
    buildCategoryTemplate({
      categoryName,
      introExcerpt,
      eyebrow: CATEGORY_EYEBROW[locale],
      locale,
      size,
      footerText: SITE_HOST || undefined,
    }),
    size
  );
}
