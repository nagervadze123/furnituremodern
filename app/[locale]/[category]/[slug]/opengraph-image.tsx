// Per-product OG image. Generated at build time for every published
// product. Renders the brand wordmark, product name, and price on the
// site's warm-cream background — no external network access (all
// static text), so the image-generation pipeline stays fast.

import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/products";
import { isCategorySlug } from "@/lib/data/categories";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Force-static so the build pre-renders one PNG per product.
export const dynamic = "force-static";

export const alt = `${siteConfig.name} — product`;

// In Next 16, params is a Promise even inside the opengraph-image route.
type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

export default async function ProductOgImage({ params }: Props) {
  const { locale: rawLocale, category, slug } = await params;
  const locale = rawLocale as Locale;

  if (!isCategorySlug(category)) notFound();

  const product = await getProductBySlug(slug, locale, category);
  if (!product) notFound();

  const price = formatPrice(product.price, product.currency, locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#fbf8f3",
          // Same accent strip as the default OG image so the brand
          // looks consistent across share previews.
          backgroundImage:
            "linear-gradient(180deg, #fbf8f3 0%, #fbf8f3 88%, #b85c38 88%, #b85c38 100%)",
        }}
      >
        <div
          style={{
            fontSize: 30,
            color: "#7a6f5e",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {siteConfig.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: "92%",
          }}
        >
          <div
            style={{
              fontSize: 84,
              color: "#28201a",
              lineHeight: 1.05,
              fontWeight: 600,
              display: "flex",
            }}
          >
            {product.name[locale]}
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#7a6f5e",
              display: "flex",
            }}
          >
            {price}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
