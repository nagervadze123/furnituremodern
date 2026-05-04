// Multi-image product gallery — Server Component shell.
//
// The static layout (aspect-locked main image + thumbnail strip) is
// rendered server-side so the primary image lands in the initial HTML
// for LCP. All interactivity (thumbnail click, lightbox open, keyboard
// nav) is delegated to the GalleryClient island below.
//
// One image: degrade to a single hero photo with no thumbnail strip.
// Zero images: render a neutral placeholder so the layout grid still
// keeps the right column from collapsing on a half-populated catalogue.

import type { Locale } from "@/i18n/routing";
import type { DataProductImage } from "@/lib/data/types";
import { GalleryClient } from "./gallery-client";

type Props = {
  images: DataProductImage[];
  locale: Locale;
  productName: string;
};

export function Gallery({ images, locale, productName }: Props) {
  if (images.length === 0) {
    return (
      <div
        className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-muted"
        aria-hidden="true"
      />
    );
  }

  return (
    <GalleryClient
      images={images}
      locale={locale}
      productName={productName}
    />
  );
}
