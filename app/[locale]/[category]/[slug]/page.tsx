// Product detail page — route: /[locale]/[category]/[slug]
// Example URL: /ka/sofas/linen-three-seater

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ViewItemTracker } from "@/components/analytics/view-item-tracker";
import { ProductLayout } from "@/components/product/ProductLayout";
import { breadcrumbListJsonLd, productJsonLd } from "@/lib/schema";
import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getProductBySlug,
  getAllProductPaths,
} from "@/lib/data/products";
import { productToItem } from "@/lib/analytics";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { routing, type Locale } from "@/i18n/routing";

// Match the category page's hourly window. Admin server actions still
// call revalidatePath() so explicit edits show up within seconds.
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

/**
 * Pre-render every published product in every locale at build time.
 * Falls back to the local catalog when Supabase isn't configured.
 */
export async function generateStaticParams() {
  const paths = await getAllProductPaths();
  return routing.locales.flatMap((locale) =>
    paths.map(({ category, slug }) => ({
      locale,
      category,
      slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, category, slug } = await params;
  const locale = rawLocale as Locale;

  // The data layer already filters by `categories.is_deleted = false`,
  // so unknown or soft-deleted categories return null without an
  // explicit precheck.
  const product = await getProductBySlug(slug, locale, category);
  if (!product) {
    return { title: "Not found", robots: { index: false } };
  }

  const canonical = absoluteUrl(`/${locale}/${category}/${slug}`);
  const title = product.name[locale];
  const description = product.description[locale];

  // Hreflang alternates: same product, different locale.
  const languages = Object.fromEntries([
    ...routing.locales.map((l) => [l, absoluteUrl(`/${l}/${category}/${slug}`)]),
    ["x-default", absoluteUrl(`/ka/${category}/${slug}`)],
  ]);

  // Per-route OG / Twitter image URLs. Each product gets dedicated
  // image route handlers (opengraph-image, twitter-image,
  // twitter-image-square) co-located in this segment that render the
  // product's name, price and primary photo into a branded card.
  const ogImage = absoluteUrl(
    `/${locale}/${category}/${slug}/opengraph-image`
  );
  const twitterImage = absoluteUrl(
    `/${locale}/${category}/${slug}/twitter-image`
  );
  const twitterImageSquare = absoluteUrl(
    `/${locale}/${category}/${slug}/twitter-image-square`
  );
  const otherLocale = routing.locales.find((l) => l !== locale);

  return {
    metadataBase: new URL(absoluteUrl("/")),
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      locale: locale === "ka" ? "ka_GE" : "en_US",
      alternateLocale: otherLocale
        ? [otherLocale === "ka" ? "ka_GE" : "en_US"]
        : undefined,
      siteName: siteConfig.name,
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

export default async function ProductDetailPage({ params }: Props) {
  const { locale: rawLocale, category, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const [product, categoryRow, tBreadcrumbs] = await Promise.all([
    getProductBySlug(slug, locale, category),
    getCategoryBySlug(category, locale),
    getTranslations("breadcrumbs"),
  ]);

  if (!product || !categoryRow) notFound();

  // Per-request CSP nonce, threaded into every inline <script> tag.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Visible breadcrumbs.
  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: categoryRow.name[locale], href: `/${category}` },
    { label: product.name[locale] },
  ];

  // BreadcrumbList JSON-LD mirrors the visible trail.
  const breadcrumbsForLd = [
    { name: tBreadcrumbs("home"), url: `/${locale}` },
    { name: categoryRow.name[locale], url: `/${locale}/${category}` },
    {
      name: product.name[locale],
      url: `/${locale}/${category}/${slug}`,
    },
  ];

  return (
    <>
      <JsonLd
        id={`ld-breadcrumbs-${slug}`}
        data={breadcrumbListJsonLd(breadcrumbsForLd)}
        nonce={nonce}
      />
      <JsonLd
        id={`ld-product-${slug}`}
        data={productJsonLd(product, locale)}
        nonce={nonce}
      />

      <ViewItemTracker item={productToItem(product, locale)} />

      <ProductLayout
        product={product}
        locale={locale}
        crumbs={crumbs}
        category={{ name: categoryRow.name[locale], slug: category }}
      />
    </>
  );
}
