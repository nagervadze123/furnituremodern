// Category landing page — route: /[locale]/[category]
//
// One file replaces the three static category routes from Phase 1
// (`/sofas`, `/bedrooms`, `/tables-chairs`). Adding a 4th category
// is now: insert the slug into Supabase + add an entry in
// `content/category-intros.ts`. No new route file required.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CategoryPage } from "@/components/sections/category-page";
import { buildCategoryMetadata } from "@/lib/seo";
import { getCategories, isCategorySlug } from "@/lib/data/categories";
import {
  getCategoryIntro,
  getCategoryTitle,
  getCategoryDescription,
} from "@/content/category-intros";
import { routing, type Locale } from "@/i18n/routing";

// Revalidate the page every 5 minutes so admin edits show up without
// a full rebuild. Server Actions in the admin panel will additionally
// call revalidatePath() for instant updates after a mutation.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; category: string }>;
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

  // Unknown category at metadata-resolution time → minimal metadata
  // and let the page itself trigger 404 below.
  if (!isCategorySlug(rawCategory)) {
    return { title: "Not found", robots: { index: false } };
  }

  return buildCategoryMetadata({
    locale,
    path: rawCategory,
    title: getCategoryTitle(rawCategory, locale),
    description: getCategoryDescription(rawCategory, locale),
  });
}

export default async function DynamicCategoryPage({ params }: Props) {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  if (!isCategorySlug(rawCategory)) notFound();

  return (
    <CategoryPage
      slug={rawCategory}
      locale={locale}
      intro={getCategoryIntro(rawCategory, locale)}
    />
  );
}
