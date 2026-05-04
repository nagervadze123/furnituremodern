// Branded 404 — renders when notFound() is called inside a [locale]
// route or when the URL contains an unsupported locale / a missing
// product slug.
//
// We deliberately do NOT echo the requested URL back at the user
// (CWE-451 trust boundary), do NOT render any error.message, and
// always serve noindex,nofollow metadata. The Log404Beacon below
// posts the pathname to /api/log-404 so the SEO dashboard can rank
// the most-hit missing paths — that telemetry is anonymous and
// purely server-side from there on.

import type { Metadata } from "next";
import { ArrowUpRight, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { Log404Beacon } from "@/components/log-404-beacon";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import { type Locale } from "@/i18n/routing";

// not-found.tsx in the App Router is statically composed under the
// [locale] layout, but Next.js does not pass params here — we read
// the active locale from next-intl's request context instead.
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "not_found" });

  return {
    title: t("title"),
    description: t("meta_description"),
    // Defensive even though Next.js auto-injects noindex on 404 status —
    // keeps the contract explicit and survives any future rendering
    // path that returns 200.
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const locale = (await getLocale()) as Locale;
  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: "not_found" }),
    getTranslations({ locale, namespace: "breadcrumbs" }),
  ]);

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: tBreadcrumbs("not_found") },
  ];

  // Recent products. Empty list is the silent-omit case below — we
  // tolerate Supabase being offline or the local fallback returning
  // nothing. We never throw from a 404 page.
  let recent: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    recent = await getProducts({ limit: 6 });
  } catch {
    recent = [];
  }

  // Active categories from the data layer (Phase 5 Task 3). Empty list
  // on a fetch failure is acceptable — the home tile and the social
  // links still render, so visitors aren't stranded.
  let cats: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    cats = await getCategories(locale);
  } catch {
    cats = [];
  }

  return (
    <>
      {/* Existing analytics beacon — unchanged behavior, just relocated. */}
      <Log404Beacon />

      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <section
        aria-labelledby="not-found-heading"
        className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16"
      >
        <p className="font-display text-6xl font-semibold tracking-tight text-foreground/30 md:text-7xl">
          404
        </p>
        <h1
          id="not-found-heading"
          className="mt-2 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          {t("title")}
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("body")}
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          {t("search_hint")} →
        </Link>
      </section>

      {/* Four navigation cards: home + the three categories.
          Plain Card-shaped tiles (no Image dependency) so we don't
          inherit the photography requirement of the home-page grid. */}
      <section
        aria-labelledby="not-found-categories-heading"
        className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16"
      >
        <h2
          id="not-found-categories-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
        >
          {t("browse_categories_heading")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {/* Home tile */}
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

      {/* Recent products — skipped silently when the data layer
          returns an empty list. We don't want a sad empty section
          on a 404. */}
      {recent.length > 0 ? (
        <section
          aria-labelledby="not-found-recent-heading"
          className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24"
        >
          <h2
            id="not-found-recent-heading"
            className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            {t("recent_products_heading")}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${p.category}/${p.slug}`}
                  className="group block min-w-0 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <h3 className="text-balance font-display text-base font-medium text-foreground">
                    {p.name[locale]}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {formatPrice(p.price, p.currency, locale)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ← {t("back_home")}
        </Link>
      </div>
    </>
  );
}
