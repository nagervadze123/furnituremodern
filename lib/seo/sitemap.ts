// Pure helpers for app/sitemap.ts. Lifted into lib/ so the alternate
// + URL generation can be unit tested without spinning up a Next
// route handler.

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";
import { routing } from "@/i18n/routing";

export type SitemapEntry = MetadataRoute.Sitemap[number];

type ChangeFreq = SitemapEntry["changeFrequency"];

// Emit one <url> per locale for the same logical route, with hreflang
// alternates pointing to every other locale plus an x-default that
// resolves to the project's defaultLocale.
//
// `route` is the locale-less path: "" for home, "sofas" for category,
// "sofas/linen-three-seater" for product. We never accept absolute
// URLs here — pass in relative routes only so the alternates list
// stays consistent.
export function localizedSitemapEntry(
  route: string,
  lastModified: Date,
  priority = 0.7,
  changeFrequency: ChangeFreq = "weekly"
): SitemapEntry[] {
  const trimmed = route.replace(/^\/+/, "").replace(/\/+$/, "");
  const pathFor = (l: string) => (trimmed ? `/${l}/${trimmed}` : `/${l}`);

  // Languages dictionary covers every routed locale plus the
  // x-default which mirrors the default locale's URL — this is what
  // tells search engines which version to show when none of the
  // user's languages match.
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, absoluteUrl(pathFor(l))])
  );
  languages["x-default"] = absoluteUrl(pathFor(routing.defaultLocale));

  return routing.locales.map((locale) => ({
    url: absoluteUrl(pathFor(locale)),
    lastModified,
    priority,
    changeFrequency,
    alternates: { languages },
  }));
}

// Coerce DB updated_at strings into Date, falling back to `now` if the
// string is missing/invalid. The fallback keeps the sitemap valid when
// we're running against the local TS catalog, which has no timestamps.
export function toLastModified(input: string | undefined, now: Date): Date {
  if (!input) return now;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? now : d;
}
