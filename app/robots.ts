// Generates /robots.txt at build time.
//
// Public marketing/catalogue routes are open to all crawlers. We
// explicitly disallow admin, internal API, Next.js build artifacts,
// and the convention-private folder so a misconfiguration cannot leak
// any of those into search results.
//
// `crawlDelay: 1` is supported by Next's MetadataRoute.Robots; we set
// a conservative one-second delay so we don't tax the Supabase free
// tier when a crawler hits the long-tail product URLs simultaneously.
//
// LLM-Sitemap directive omitted: Next's MetadataRoute.Robots type does
// not currently expose a non-standard custom field, and the directive
// itself isn't part of the robots.txt RFC. Discoverability is instead
// handled in app/[locale]/layout.tsx via
// `<link rel="alternate" type="text/plain" href="/llms-full.txt">`,
// which is the head-based mechanism most AI crawlers honor today.

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/admin",
          "/api/admin/",
          "/_next/",
          "/private/",
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
