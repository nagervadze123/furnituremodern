// Root Twitter card image — served at /twitter-image. Same content as
// the root /opengraph-image but lives on its own route so platform
// crawlers that respect the `twitter:image` tag pick the right asset.
//
// Runtime: Node + force-static. Same rationale as the root OG image:
// no Supabase reads → pre-render once at build time.

import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildBaseTemplate,
  OG_DIMENSIONS,
  renderOgResponse,
} from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_DIMENSIONS;
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.brand.tagline.ka}`;

export default async function Image() {
  return renderOgResponse(
    buildBaseTemplate({
      title: siteConfig.name,
      subtitle: siteConfig.brand.tagline.ka,
      eyebrow: siteConfig.shortDescription.ka,
      footerText: SITE_HOST || undefined,
      locale: "ka",
      size,
    }),
    size
  );
}
