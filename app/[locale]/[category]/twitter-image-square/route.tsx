// Square (600×600) per-category Twitter card. Routed manually because
// `twitter-image-square` is not a Next metadata file convention.
//
// Runtime: Node + force-static.

import { notFound } from "next/navigation";

import {
  getCategories,
  getCategoryBySlug,
  isCategorySlug,
} from "@/lib/data/categories";
import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildCategoryTemplate,
  renderOgResponse,
  SQUARE_DIMENSIONS,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const categories = await getCategories();
  return routing.locales.flatMap((locale) =>
    categories.map((c) => ({ locale, category: c.slug }))
  );
}

const CATEGORY_EYEBROW = { ka: "კატეგორია", en: "Category" } as const;

type Props = { params: Promise<{ locale: string; category: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { locale: raw, category } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  if (!isCategorySlug(category)) notFound();

  const row = await getCategoryBySlug(category, locale);
  const categoryName = row?.name[locale] ?? siteConfig.name;

  return renderOgResponse(
    buildCategoryTemplate({
      categoryName,
      eyebrow: CATEGORY_EYEBROW[locale],
      locale,
      size: SQUARE_DIMENSIONS,
      footerText: SITE_HOST || undefined,
    }),
    SQUARE_DIMENSIONS
  );
}
