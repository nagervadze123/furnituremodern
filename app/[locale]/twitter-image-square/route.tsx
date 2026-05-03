// Locale-aware square (600×600) Twitter card. Routed manually because
// `twitter-image-square` is not a Next metadata file convention; the
// per-locale page metadata wires this URL into twitter.images.
//
// Runtime: Node + force-static. Pre-renders one square PNG per locale
// at build time.

import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildBaseTemplate,
  renderOgResponse,
  SQUARE_DIMENSIONS,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { locale: raw } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  return renderOgResponse(
    buildBaseTemplate({
      title: siteConfig.name,
      subtitle: siteConfig.brand.tagline[locale],
      footerText: SITE_HOST || undefined,
      locale,
      size: SQUARE_DIMENSIONS,
    }),
    SQUARE_DIMENSIONS
  );
}
