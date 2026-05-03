// Root square (600×600) Twitter card. Lives in its own route segment
// because Next's metadata file conventions only recognise the canonical
// `twitter-image` filename — the square variant is therefore wired
// manually into page metadata.openGraph.images / metadata.twitter.images.
//
// Runtime: Node + force-static. No Supabase reads → pre-render once.

import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildBaseTemplate,
  renderOgResponse,
  SQUARE_DIMENSIONS,
} from "@/lib/og";

export const dynamic = "force-static";

export async function GET() {
  return renderOgResponse(
    buildBaseTemplate({
      title: siteConfig.name,
      subtitle: siteConfig.brand.tagline.ka,
      footerText: SITE_HOST || undefined,
      locale: "ka",
      size: SQUARE_DIMENSIONS,
    }),
    SQUARE_DIMENSIONS
  );
}
