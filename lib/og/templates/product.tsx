// Product OG template. Wraps the base template with a right-hand
// product image when one is available; otherwise gracefully falls back
// to the monogram-only base layout. Layout adapts to square mode by
// stacking image above title instead of side-by-side.

import type { JSX } from "react";

import type { Locale } from "@/i18n/routing";
import {
  isSquare,
  OG_DIMENSIONS,
  type OgDimensions,
} from "../dimensions";
import { buildBaseTemplate } from "./base";

export type ProductTemplateProps = {
  productName: string;
  formattedPrice: string;
  /** Localized "Category" eyebrow ("კატეგორია" / "Category"). */
  categoryEyebrow?: string;
  /** Localized category name appended to the eyebrow line. */
  categoryName?: string;
  /** Absolute URL of the product's primary image. */
  productImageUrl?: string;
  /** Alt text for the product image; not rendered, but kept for parity. */
  productImageAlt?: string;
  locale: Locale;
  size?: OgDimensions;
  footerText?: string;
};

export function buildProductTemplate(
  props: ProductTemplateProps
): JSX.Element {
  const {
    productName,
    formattedPrice,
    categoryEyebrow,
    categoryName,
    productImageUrl,
    locale,
    size = OG_DIMENSIONS,
    footerText,
  } = props;

  const square = isSquare(size);

  const eyebrow = categoryEyebrow && categoryName
    ? `${categoryEyebrow} · ${categoryName}`
    : categoryEyebrow ?? categoryName;

  // No image available → render base template with monogram-only layout.
  if (!productImageUrl) {
    return buildBaseTemplate({
      title: productName,
      subtitle: formattedPrice,
      eyebrow,
      locale,
      size,
      footerText,
    });
  }

  // Square layouts compress: render base template with the image as a
  // small thumbnail above the headline. Landscape: image takes the
  // right column.
  const imageHeight = square ? 240 : 420;
  const imageWidth = square ? 240 : 420;

  const rightSlot = (
    <div
      style={{
        display: "flex",
        width: imageWidth,
        height: imageHeight,
        // Subtle rounded corners + a thin 1px divider so the image
        // reads as part of a card rather than a freestanding photo.
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#eee",
      }}
    >
      {/* Satori renders <img> from a remote URL synchronously during
          generation; the alt attribute is required by the React types
          but not rendered into the PNG. next/image cannot run inside
          ImageResponse — Satori does not execute the optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={productImageUrl}
        alt=""
        width={imageWidth}
        height={imageHeight}
        style={{
          width: imageWidth,
          height: imageHeight,
          objectFit: "cover",
          display: "flex",
        }}
      />
    </div>
  );

  return buildBaseTemplate({
    title: productName,
    subtitle: formattedPrice,
    eyebrow,
    locale,
    size,
    footerText,
    rightSlot,
  });
}
