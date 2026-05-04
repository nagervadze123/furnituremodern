// Display text. The largest type-scale step — used for landing-page
// hero headlines and cover plates. Maps onto the `display-1` /
// `display-2` typography tokens.
//
// Default tag is <h1> for variant 1, <h2> for variant 2 (display-2 is
// usually a section-introducing line, rarely the page's H1). Override
// via `as` if the semantic tag should be different from the visual
// scale — e.g. an h2 styled as display-2.

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  1: "text-[4rem] leading-[1.05] tracking-[-0.03em] font-display",
  2: "text-5xl md:text-[3rem] leading-[1.08] tracking-[-0.02em] font-display",
} as const;

export type DisplayVariant = keyof typeof VARIANT_CLASS;

type DisplayProps<T extends ElementType = "h1"> = {
  variant?: DisplayVariant;
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "variant" | "className" | "children">;

export function Display<T extends ElementType = "h1">({
  variant = 1,
  as,
  className,
  children,
  ...rest
}: DisplayProps<T>) {
  // Cast through a children-aware ElementType at the JSX call so React
  // 19's stricter children checking on the union ElementType doesn't
  // collapse to `never`. Public API types still come from `T`.
  const Tag = (as ?? (variant === 1 ? "h1" : "h2")) as ElementType<{
    className?: string;
    children?: ReactNode;
  }>;
  return (
    <Tag
      className={cn(
        "text-balance text-[var(--color-ink-100)]",
        VARIANT_CLASS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
