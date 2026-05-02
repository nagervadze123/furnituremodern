// Product detail page — route: /[locale]/[category]/[slug]
// Example URL: /ka/sofas/linen-three-seater

import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListJsonLd, productJsonLd } from "@/lib/schema";
import { getCategoryBySlug, isCategorySlug } from "@/lib/data/categories";
import {
  getProductBySlug,
  getAllProductPaths,
} from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { routing, type Locale } from "@/i18n/routing";

// Same revalidation cadence as the category pages so admin edits
// propagate without a full rebuild. Server actions also revalidatePath().
export const revalidate = 300;

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

  if (!isCategorySlug(category)) {
    return { title: "Not found", robots: { index: false } };
  }

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
      siteName: siteConfig.name,
      // Each product gets its own dynamic OG image (see opengraph-image.tsx
      // in this same folder). Resolved as an absolute URL so social
      // unfurlers can fetch it directly.
      images: [
        absoluteUrl(`/${locale}/${category}/${slug}/opengraph-image`),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        absoluteUrl(`/${locale}/${category}/${slug}/opengraph-image`),
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale: rawLocale, category, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  if (!isCategorySlug(category)) notFound();

  const [product, categoryRow, tBreadcrumbs] = await Promise.all([
    getProductBySlug(slug, locale, category),
    getCategoryBySlug(category, locale),
    getTranslations("breadcrumbs"),
  ]);

  if (!product || !categoryRow) notFound();

  // Per-request CSP nonce, threaded into every inline <script> tag.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const primary = product.images[0];

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

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <article className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 md:grid-cols-2 md:gap-12 md:px-6 md:pt-12 md:pb-24">
        {/* Image gallery — currently a single primary image. Multi-image
            layout drops in here when products gain more photos. */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt[locale]}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          ) : null}
        </div>

        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            {product.name[locale]}
          </h1>
          <p className="mt-4 text-2xl font-medium text-foreground">
            {formatPrice(product.price, product.currency, locale)}
          </p>
          <div className="mt-8 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
            <p>{product.description[locale]}</p>
          </div>
        </div>
      </article>
    </>
  );
}
