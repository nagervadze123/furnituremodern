// Editorial display-step heading. Phase 6 Slice 5 D4 implementation:
// `variant: 'hero' | 1 | 2 | 3` is the entire size API. Each variant
// maps onto a CSS class primitive in `app/globals.css` so the
// resolved font-size, opsz, line-height, and italic-em accent stay
// in one place. New sizes get new variant values — there is no
// `sizeOverride` escape hatch (the absence is the point: every
// editorial heading on the site reads at one of four documented
// type scales).
//
// Default semantic tag tracks the typical scale-to-role mapping:
// hero / variant 1 → <h1>, variant 2 → <h2>, variant 3 → <h3>.
// Override via `as` when the visual scale and the document outline
// disagree (e.g. an `<h2>` that needs to read as the largest line
// inside a sub-page hero).
//
// `Display` (the older primitive at `./Display.tsx`) stays in the
// barrel until Slice 8: it has a Category-page consumer
// (`components/category/CategoryHero.tsx`) that ports in Slice 6.

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  hero: "display-hero",
  1: "display-1",
  2: "display-2",
  3: "display-3",
} as const;

const DEFAULT_TAG = {
  hero: "h1",
  1: "h1",
  2: "h2",
  3: "h3",
} as const;

export type EditorialHeadingVariant = keyof typeof VARIANT_CLASS;

type EditorialHeadingProps<T extends ElementType = "h1"> = {
  variant: EditorialHeadingVariant;
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "variant" | "className" | "children"
>;

export function EditorialHeading<T extends ElementType = "h1">({
  variant,
  as,
  className,
  children,
  ...rest
}: EditorialHeadingProps<T>) {
  // Cast through a children-aware ElementType so React 19's stricter
  // children typing on the union doesn't collapse to `never`. Public
  // API types still come from `T`.
  const Tag = (as ?? DEFAULT_TAG[variant]) as ElementType<{
    className?: string;
    children?: ReactNode;
  }>;

  return (
    <Tag className={cn(VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}
