// Max-width content wrapper. Every editorial / catalogue page section
// should be wrapped in a Container so horizontal padding and the
// max-width column stay consistent across the site.
//
// Variants tune the max-width for the kind of content inside:
//   • narrow  — long-form prose where readability beats density
//   • default — most page sections (hero, grids, cards)
//   • wide    — editorial home / marketing layouts on large monitors
//   • full    — true edge-to-edge (no max-width); padding still applied
//
// `wide` was 1280px (max-w-7xl) through Phase 5; on a 1920px+ display
// that left ~320px of empty gutter on each side and made the page read
// as a column floating in the middle of the viewport. We bumped it to
// 1760px so editorial sections fill the screen on a typical desktop
// while still capping content at a humane reading width.

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[1760px]",
  full: "max-w-none",
} as const;

export type ContainerVariant = keyof typeof VARIANT_CLASS;

type ContainerProps = ComponentPropsWithoutRef<"div"> & {
  variant?: ContainerVariant;
};

export function Container({
  variant = "default",
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        VARIANT_CLASS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
