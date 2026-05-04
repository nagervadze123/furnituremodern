// Search route stub — /[locale]/search?q=...
//
// We surface this as a real, resolvable endpoint mainly so the
// SearchAction in WebSite JSON-LD (lib/schema.ts) points at a route
// that responds. The URL contract (?q=) is the one schema.org
// SearchAction advertises; once a real search experience exists,
// replace the body below with the actual results UI.
//
// Marked noindex,nofollow while it's a stub: we don't want crawlers
// indexing an empty "coming soon" page, but we DO want the URL to
// resolve so the SearchAction's urlTemplate validates.
//
// q-param hardening:
//   • Trim + clamp to 200 chars so a long URL can't paint a giant
//     string into the page.
//   • Strip ASCII control characters (\x00-\x1f and \x7f) before
//     rendering. React's default JSX escaping already handles HTML
//     safety; the control-char strip is purely a display hygiene
//     measure (zero-width / RTL override / null bytes in a URL).
//   • Never echo q into an HTML attribute — we only render it as
//     a JSX text child.

import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListJsonLd } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site-config";
import { getCategories } from "@/lib/data/categories";
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
    // Stub — keep the page out of the index AND don't follow internal
    // links from it. Until search ships, neither index nor follow
    // makes the right contract. The canonical URL deliberately omits
    // ?q= so Google never sees a near-infinite set of variants.
    robots: { index: false, follow: false },
    alternates: {
      canonical: absoluteUrl(`/${locale}/search`),
    },
  };
}

// Drop ASCII control characters before rendering. JSX text-child
// escaping already handles HTML safety; this is for display hygiene
// — null bytes, vertical tabs, RTL overrides — that would otherwise
// mangle the page even though they're "safe."
function sanitizeQuery(q: string): string {
  return q.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 200);
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const { q = "" } = await searchParams;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const [t, tBreadcrumbs, cats] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "breadcrumbs" }),
    getCategories(locale),
  ]);

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: tBreadcrumbs("search") },
  ];

  const sanitized = sanitizeQuery(q);

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

      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <section
        aria-labelledby="search-heading"
        className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16"
      >
        <h1
          id="search-heading"
          className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          {t("title")}
        </h1>
        {sanitized ? (
          <p className="mt-4 text-base text-muted-foreground">
            {t("term_label")}:{" "}
            {/* React's default JSX escaping renders user input as
                text — never as HTML/attribute. Do not refactor this
                into a dangerouslySetInnerHTML or a string-template
                attribute value. */}
            <span className="font-medium text-foreground">{sanitized}</span>
          </p>
        ) : null}
        <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("comingSoonBody")}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("backHome")} →
        </Link>
      </section>

      {/* Same four-card grid pattern as not-found.tsx — keeps the
          stub useful (visitors land here, can still get to a
          category) without spinning up a new design. */}
      <section
        aria-labelledby="search-categories-heading"
        className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24"
      >
        <h2
          id="search-categories-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
        >
          {t("browse_categories_heading")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
          <li>
            <Link
              href="/"
              className="group flex h-full min-w-0 items-start justify-between gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="min-w-0">
                <h3 className="font-display text-base font-medium text-foreground">
                  {tBreadcrumbs("home")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  furnituremodern.ge
                </p>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
          {cats.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/${cat.slug}`}
                className="group flex h-full min-w-0 items-start justify-between gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="min-w-0">
                  <h3 className="font-display text-base font-medium text-foreground">
                    {cat.name[locale]}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cat.description[locale]}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
