// Auto-generated XML sitemap at /sitemap.xml.
//
// Lists every public page in every supported locale, plus the
// hreflang alternates block so search engines understand the
// relationship between language versions of the same page. Admin
// routes are intentionally omitted (and additionally Disallow'd in
// robots.txt).
//
// Cached for an hour so a crawler hitting the long-tail product URLs
// doesn't multiply Supabase reads. Admin server actions call
// revalidatePath("/sitemap.xml") whenever a public URL changes so
// fresh data appears on the next crawl regardless of the TTL.
//
// Why a single sitemap and not a sitemap index? At current scale
// (3 categories × dozens of products in 2 locales) we are far below
// the 50,000-URL hard limit and the 50MB soft limit — splitting
// into pages/categories/products would add a sitemap index, three
// child sitemaps, and one extra revalidation surface per admin save
// without observable benefit. If product count crosses the few-
// thousand mark we revisit by switching this file to a sitemap
// index and adding child route handlers.

import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/data/categories";
import { getAllProductPaths } from "@/lib/data/products";
import {
  localizedSitemapEntry,
  toLastModified,
} from "@/lib/seo/sitemap";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [categories, productPaths] = await Promise.all([
    getCategories(),
    getAllProductPaths(),
  ]);

  // The latest product updated_at across the catalog is a reasonable
  // proxy for "site freshness" — used as lastModified for the home
  // and category pages, both of which surface product cards.
  const latestProductTs = productPaths.reduce<Date>((acc, p) => {
    const t = toLastModified(p.updatedAt, now);
    return t > acc ? t : acc;
  }, new Date(0));
  const siteLastMod = latestProductTs.getTime() === 0 ? now : latestProductTs;

  const home = localizedSitemapEntry("", siteLastMod, 1.0, "daily");

  const categoryEntries = categories.flatMap((c) =>
    localizedSitemapEntry(c.slug, siteLastMod, 0.8, "weekly")
  );

  const productEntries = productPaths.flatMap((p) =>
    localizedSitemapEntry(
      `${p.category}/${p.slug}`,
      toLastModified(p.updatedAt, now),
      0.6,
      "weekly"
    )
  );

  return [...home, ...categoryEntries, ...productEntries];
}
