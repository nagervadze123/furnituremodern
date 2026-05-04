// Product detail page — route: /[locale]/[category]/[slug]
// Example URL: /ka/sofas/linen-three-seater

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ViewItemTracker } from "@/components/analytics/view-item-tracker";
import { Gallery } from "@/components/product/gallery";
import { breadcrumbListJsonLd, productJsonLd } from "@/lib/schema";
import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getProductBySlug,
  getAllProductPaths,
} from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import { productToItem } from "@/lib/analytics";
import {
  formatLastUpdated,
  LAST_UPDATED_LABEL,
} from "@/lib/aeo/summary";
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

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <article className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-8 sm:gap-10 md:grid-cols-2 md:gap-12 md:px-6 md:pt-12 md:pb-24">
        <div className="min-w-0">
          <Gallery
            images={product.images}
            locale={locale}
            productName={product.name[locale]}
          />
        </div>

        <div className="min-w-0">
          {/* Headline scale steps from text-3xl on smallest phones up
              through sm/md breakpoints; `text-balance` evens out a
              two-line wrap and `break-words` is the safety net for a
              single 30+ character Georgian compound name. */}
          <h1 className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight break-words text-foreground sm:text-4xl md:text-5xl">
            {product.name[locale]}
          </h1>
          <p className="mt-4 text-2xl font-medium text-foreground tabular-nums">
            {formatPrice(product.price, product.currency, locale)}
          </p>
          <div className="mt-8 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
            <p className="break-words">{product.description[locale]}</p>
          </div>

          {/* Last-updated freshness signal — a real <time> element so
              crawlers pick it up as a structured timestamp. Sourced
              from updated_at, fallback to created_at; emitted only
              when at least one is available. */}
          {(() => {
            const ts = product.updatedAt ?? product.createdAt;
            if (!ts) return null;
            const formatted = formatLastUpdated(ts, locale);
            if (!formatted) return null;
            return (
              <p className="mt-6 text-sm text-muted-foreground">
                {LAST_UPDATED_LABEL[locale]}:{" "}
                <time dateTime={ts}>{formatted}</time>
              </p>
            );
          })()}
        </div>
      </article>
    </>
  );
}
