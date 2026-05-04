// Category landing page — route: /[locale]/[category]
//
// One file replaces the three static category routes from Phase 1
// (`/sofas`, `/bedrooms`, `/tables-chairs`). Categories are now fully
// Supabase-driven (Phase 5 Task 3): the operator creates a row in
// /admin/categories — name, tagline, intro paragraph, sort order,
// "show in nav" toggle — and the public site picks it up on the next
// revalidate tick. No code change required to add a new category.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CategoryPage } from "@/components/sections/category-page";
import { parseSortKey } from "@/components/category/sort-keys";
import { buildCategoryMetadata } from "@/lib/seo";
import { getCategories, getCategoryBySlug } from "@/lib/data/categories";
import { routing, type Locale } from "@/i18n/routing";

// Revalidate every hour. Categories change rarely (operator adds maybe
// one or two per quarter) and the page is one of the most-cached
// surfaces, so a longer ISR window cuts edge-cache thrash. Admin server
// actions still call revalidatePath() so an explicit edit shows up
// within seconds rather than waiting for the natural tick.
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Pre-render every (locale, category) tuple at build time. We pull
 * the category list from the data layer so this also works when new
 * categories arrive in Supabase.
 */
export async function generateStaticParams() {
  const categories = await getCategories();
  return routing.locales.flatMap((locale) =>
    categories.map((c) => ({ locale, category: c.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = rawLocale as Locale;

  // Unknown / soft-deleted category at metadata-resolution time →
  // minimal metadata and let the page itself trigger 404 below.
  const row = await getCategoryBySlug(rawCategory, locale);
  if (!row) {
    return { title: "Not found", robots: { index: false } };
  }

  return buildCategoryMetadata({
    locale,
    path: rawCategory,
    title: row.name[locale],
    description: row.description[locale],
  });
}

export default async function DynamicCategoryPage({
  params,
  searchParams,
}: Props) {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const row = await getCategoryBySlug(rawCategory, locale);
  if (!row) notFound();

  // Read & validate the sort param. Anything we don't recognise is
  // silently ignored — keeps the canonical URL clean and avoids any
  // exposure to crafted params from unfriendly inbound links.
  const sp = await searchParams;
  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = parseSortKey(rawSort);

  return (
    <CategoryPage
      slug={rawCategory}
      locale={locale}
      intro={row.intro[locale]}
      sort={sort}
    />
  );
}
