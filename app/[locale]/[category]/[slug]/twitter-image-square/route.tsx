// Square (600×600) per-product Twitter card. Routed manually because
// `twitter-image-square` is not a Next metadata file convention.
//
// Runtime: Node + force-static.

import { notFound } from "next/navigation";

import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getAllProductPaths,
  getProductBySlug,
} from "@/lib/data/products";
import { formatPriceForOg } from "@/lib/format";
import { SITE_HOST } from "@/lib/site-config";
import {
  buildProductTemplate,
  renderOgResponse,
  SQUARE_DIMENSIONS,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";

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

export async function GET(_req: Request, { params }: Props) {
  const { locale: raw, category, slug } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  const [product, categoryRow] = await Promise.all([
    getProductBySlug(slug, locale, category),
    getCategoryBySlug(category, locale),
  ]);
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
      size: SQUARE_DIMENSIONS,
      footerText: SITE_HOST || undefined,
    }),
    SQUARE_DIMENSIONS
  );
}
