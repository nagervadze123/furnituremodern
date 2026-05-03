// Aspect-ratio-locked Next/Image wrapper. Use this anywhere a layout
// would otherwise be vulnerable to CLS while the image loads — every
// product card, hero photo, category banner, etc. The wrapper enforces
// a known aspect ratio via Tailwind's `aspect-[w/h]` utility, and the
// inner <Image fill> stretches to fill it.
//
// Default ratio is 4/5 (portrait card) — matches the existing
// product-card aspect across the catalogue. Override per-instance via
// the `ratio` prop. See lib/perf/blur.ts for the blur placeholder
// helpers used at the call site.

import Image, { type ImageProps } from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const RATIO_CLASS = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "3/2": "aspect-[3/2]",
  "16/9": "aspect-video",
  "21/9": "aspect-[21/9]",
} as const;

export type AspectRatio = keyof typeof RATIO_CLASS;

type AspectImageProps = Omit<ImageProps, "fill" | "width" | "height" | "ref"> & {
  ratio?: AspectRatio;
  /**
   * Optional className applied to the outer aspect wrapper. Use this
   * when you need a rounded corner / shadow on the wrapper itself.
   */
  wrapperClassName?: string;
  /** Optional overlay rendered above the image (gradient, badge, etc.). */
  overlay?: ReactNode;
};

export function AspectImage({
  ratio = "4/5",
  wrapperClassName,
  className,
  overlay,
  alt,
  sizes,
  ...imageProps
}: AspectImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        RATIO_CLASS[ratio],
        wrapperClassName
      )}
    >
      <Image
        {...imageProps}
        alt={alt ?? ""}
        // sizes is required for `fill` images so Next picks a
        // reasonable srcset entry; default to a generous responsive
        // hint and let consumers tune it.
        sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
        fill
        className={cn("object-cover", className)}
      />
      {overlay}
    </div>
  );
}
