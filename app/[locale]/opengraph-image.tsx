// Locale-aware OpenGraph image. Auto-wired by Next at
// /[locale]/opengraph-image; the page metadata for /[locale] picks it
// up automatically because file-based metadata wins over the parent
// segment's image.
//
// Runtime: Node + force-static. Pre-renders one PNG per locale at
// build time so social unfurlers never wait on a cold render.

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
  const tagline = siteConfig.brand.tagline[locale];
  const eyebrow = siteConfig.shortDescription[locale];

  return renderOgResponse(
    buildBaseTemplate({
      title: siteConfig.name,
      subtitle: tagline,
      eyebrow,
      footerText: SITE_HOST || undefined,
      locale,
      size,
    }),
    size
  );
}
