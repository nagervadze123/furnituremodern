// Body text. Maps onto the `body-lg`, `body`, `body-sm` typography
// tokens. Default tag is <p> — when the body content is rendered
// inside a list or definition list, override via `as`.

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Phase 5b editorial scale: extra-generous line-heights for slow,
// considered reading (matches the typography tokens in lib/design).
const VARIANT_CLASS = {
  lg: "text-[1.125rem] leading-[1.7]",
  default: "text-base leading-[1.75]",
  sm: "text-[0.875rem] leading-[1.65]",
} as const;

export type BodyVariant = keyof typeof VARIANT_CLASS;

type BodyProps<T extends ElementType = "p"> = {
  variant?: BodyVariant;
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "variant" | "className" | "children">;

export function Body<T extends ElementType = "p">({
  variant = "default",
  as,
  className,
  children,
  ...rest
}: BodyProps<T>) {
  // Cast through a children-aware ElementType at the JSX call so React
  // 19's stricter children checking on the union ElementType doesn't
  // collapse to `never`. Public API types still come from `T`.
  const Tag = (as ?? "p") as ElementType<{
    className?: string;
    children?: ReactNode;
  }>;
  return (
    <Tag
      className={cn(
        "text-pretty text-[var(--color-ink-80)]",
        VARIANT_CLASS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
