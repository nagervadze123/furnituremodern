// Aspect-locked editorial photo frame. Phase 6 Slice 5 — landed
// alongside its first homepage consumers (FeaturedCategories,
// FeaturedCollection, SignatureProducts) per D1.
//
// Composes freely: drop a `next/image` with `fill` inside, or an
// overlay, or a caption, or all three. The frame itself is just a
// relative aspect-locked block with the editorial 1 px bone-200
// hairline border + bone-100 inner background — the same treatment
// the design reference inlines in `_design-reference/components/
// page-homepage.jsx` placeholders. Codifying it here means
// consumers don't repeat the wrapperClassName string across every
// row.
//
// Distinct from `AspectImage` (`./AspectImage.tsx`):
//   • AspectImage = aspect-locked Image (no frame). Used for
//     full-bleed hero / banner photos where the image edges are
//     the layout edges.
//   • AspectFrame = editorial framed media wrapper. Used for
//     content cards where the image sits on a card-like surface.
// The two coexist and both stay in the barrel.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const RATIO_CLASS = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "16/9": "aspect-video",
} as const;

export type AspectFrameRatio = keyof typeof RATIO_CLASS;

type AspectFrameProps = {
  ratio: AspectFrameRatio;
  className?: string;
  children: ReactNode;
};

export function AspectFrame({ ratio, className, children }: AspectFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-[var(--color-bone-200)] bg-[var(--color-bone-100)]",
        RATIO_CLASS[ratio],
        className
      )}
    >
      {children}
    </div>
  );
}
