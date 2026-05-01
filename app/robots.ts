// Generates /robots.txt at build time.
// Default policy: allow everything, point crawlers at the sitemap.

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin panel must never be indexed. Combined with the no-index
        // header pattern in proxy.ts, this is belt-and-braces.
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
