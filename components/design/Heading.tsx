// Heading text. Maps onto the `heading-1`, `heading-2`, `heading-3`
// typography tokens. Default tag scales with the variant (h1/h2/h3) so
// consumers get a sensible semantic level out of the box; override via
// `as` when the visual scale should be decoupled from the tag.

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Phase 5b editorial scale with mobile step-down. variant 1 is the
// section H1 / H2 (2rem desktop / 1.625rem mobile); variant 2 is sub-
// section (1.5rem / 1.25rem); variant 3 is card titles (1.125rem / 1rem).
const VARIANT_CLASS = {
  1: "text-[1.625rem] md:text-[2rem] leading-[1.18] tracking-[-0.015em]",
  2: "text-[1.25rem] md:text-[1.5rem] leading-[1.25] tracking-[-0.01em]",
  3: "text-[1rem] md:text-[1.125rem] leading-[1.4]",
} as const;

const DEFAULT_TAG = {
  1: "h1",
  2: "h2",
  3: "h3",
} as const;

export type HeadingVariant = keyof typeof VARIANT_CLASS;

type HeadingProps<T extends ElementType = "h2"> = {
  variant?: HeadingVariant;
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "variant" | "className" | "children">;

export function Heading<T extends ElementType = "h2">({
  variant = 2,
  as,
  className,
  children,
  ...rest
}: HeadingProps<T>) {
  // Cast through a children-aware ElementType at the JSX call so React
  // 19's stricter children checking on the union ElementType doesn't
  // collapse to `never`. Public API types still come from `T`.
  const Tag = (as ?? DEFAULT_TAG[variant]) as ElementType<{
    className?: string;
    children?: ReactNode;
  }>;
  return (
    <Tag
      className={cn(
        "text-balance font-display text-[var(--color-ink-100)]",
        VARIANT_CLASS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
