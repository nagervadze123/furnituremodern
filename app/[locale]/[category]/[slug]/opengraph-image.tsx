// Per-product OpenGraph image. Auto-wired at
// /[locale]/[category]/[slug]/opengraph-image.
//
// Renders the product name, formatted price, the category eyebrow and
// (when available) the product's primary image on the right side. Data
// flows through the same lib/data/products.ts the page uses, so the
// unfurled card and the page never disagree.
//
// Runtime: Node + force-static. Reads Supabase (or the local fallback)
// via the data layer at build time so every published product ships
// its own pre-rendered branded card.

import { notFound } from "next/navigation";

import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getAllProductPaths,
  getProductBySlug,
} from "@/lib/data/products";
import { formatPriceForOg } from "@/lib/format";
import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildProductTemplate,
  OG_DIMENSIONS,
  renderOgResponse,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";
export const size = OG_DIMENSIONS;
export const contentType = "image/png";
export const alt = `${siteConfig.name} — product`;

export async function generateStaticParams() {
  const paths = await getAllProductPaths();
  return routing.locales.flatMap((locale) =>
    paths.map(({ category, slug }) => ({ locale, category, slug }))
  );
}

const CATEGORY_EYEBROW = { ka: "კატეგორია", en: "Category" } as const;

type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

export default async function Image({ params }: Props) {
  const { locale: raw, category, slug } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  const [product, categoryRow] = await Promise.all([
    getProductBySlug(slug, locale, category),
    getCategoryBySlug(category, locale),
  ]);
  // No category row → soft-deleted or unknown slug; no product → likewise.
  if (!product || !categoryRow) notFound();

  const formattedPrice = formatPriceForOg(
    product.price,
    product.currency,
    locale
  );
  const primaryImage = product.images[0]?.url;

  return renderOgResponse(
    buildProductTemplate({
      productName: product.name[locale],
      formattedPrice,
      categoryEyebrow: CATEGORY_EYEBROW[locale],
      categoryName: categoryRow.name[locale],
      productImageUrl: primaryImage,
      locale,
      size,
      footerText: SITE_HOST || undefined,
    }),
    size
  );
}
