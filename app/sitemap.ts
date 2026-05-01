// Auto-generated XML sitemap at /sitemap.xml.
//
// Lists every public page in every supported locale, plus the alternates
// hreflang block so search engines understand the relationship between
// language versions of the same page. Admin routes are intentionally
// omitted (and additionally Disallow'd in robots.txt).

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";
import { routing } from "@/i18n/routing";
import { getCategories } from "@/lib/data/categories";
import { getAllProductPaths } from "@/lib/data/products";

type SitemapEntry = MetadataRoute.Sitemap[number];

// Emit one <url> per locale for the same logical route, with hreflang
// alternates pointing to every other locale.
function localizedEntry(
  route: string,
  priority: number,
  lastModified: Date
): SitemapEntry[] {
  return routing.locales.map((locale) => {
    const path = route ? `/${locale}/${route}` : `/${locale}`;
    const languages = Object.fromEntries(
      routing.locales.map((l) => [
        l,
        absoluteUrl(route ? `/${l}/${route}` : `/${l}`),
      ])
    );
    return {
      url: absoluteUrl(path),
      lastModified,
      priority,
      changeFrequency: "weekly" as const,
      alternates: { languages },
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [categories, productPaths] = await Promise.all([
    getCategories(),
    getAllProductPaths(),
  ]);

  const home = localizedEntry("", 1.0, now);
  const categoryEntries = categories.flatMap((c) =>
    localizedEntry(c.slug, 0.8, now)
  );
  const productEntries = productPaths.flatMap((p) =>
    localizedEntry(`${p.category}/${p.slug}`, 0.6, now)
  );

  return [...home, ...categoryEntries, ...productEntries];
}
