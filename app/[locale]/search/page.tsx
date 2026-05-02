// Search route stub — /[locale]/search?q=...
//
// We surface this as a real, indexable-ish endpoint mainly so the
// SearchAction in WebSite JSON-LD points at a route that responds.
// Once a real search experience exists, replace the body below with
// the actual results UI; the URL contract (?q=) is already the one
// schema.org SearchAction advertises.
//
// Marked noindex while it's a stub: we don't want crawlers indexing
// an empty "coming soon" page, but we DO want the URL to resolve so
// the SearchAction's urlTemplate validates.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListJsonLd } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site-config";
import { type Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: t("title"),
    // Stub state — keep the page out of the index until search is real.
    robots: { index: false, follow: true },
    alternates: {
      canonical: absoluteUrl(`/${locale}/search`),
    },
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const { q = "" } = await searchParams;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "breadcrumbs" }),
  ]);

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: tBreadcrumbs("search") },
  ];

  // Trim + clamp the query so a malicious very-long URL doesn't
  // surface a giant string into the page.
  const trimmed = q.trim().slice(0, 200);

  return (
    <>
      <JsonLd
        id="ld-search-breadcrumbs"
        data={breadcrumbListJsonLd([
          { name: tBreadcrumbs("home"), url: `/${locale}` },
          { name: tBreadcrumbs("search"), url: `/${locale}/search` },
        ])}
        nonce={nonce}
      />

      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {t("comingSoonHeading")}
        </h1>
        {trimmed ? (
          <p className="mt-4 text-base text-muted-foreground">
            {t("queryLabel")}: <span className="font-medium text-foreground">{trimmed}</span>
          </p>
        ) : null}
        <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("comingSoonBody")}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("backHome")} →
        </Link>
      </section>
    </>
  );
}
