// Locale-aware Twitter card image. Auto-wired by Next at
// /[locale]/twitter-image. Same content as the locale OG variant.
//
// Runtime: Node + force-static. Pre-renders per locale at build time.

import { siteConfig, SITE_HOST } from "@/lib/site-config";
import {
  buildBaseTemplate,
  OG_DIMENSIONS,
  renderOgResponse,
} from "@/lib/og";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-static";
export const size = OG_DIMENSIONS;
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.brand.tagline.ka}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export default async function Image({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (raw === "en" ? "en" : "ka") as Locale;

  return renderOgResponse(
    buildBaseTemplate({
      title: siteConfig.name,
      subtitle: siteConfig.brand.tagline[locale],
      eyebrow: siteConfig.shortDescription[locale],
      footerText: SITE_HOST || undefined,
      locale,
      size,
    }),
    size
  );
}
