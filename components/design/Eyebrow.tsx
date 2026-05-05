// Small uppercase label that sits above headings ("Featured", "New",
// "Limited edition"). Maps to the `caption` typography token —
// 0.75rem, generous tracking, accent color. Renders inline (a span)
// so it can sit before, beside, or above a heading without forcing a
// block break.

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type EyebrowProps = ComponentPropsWithoutRef<"span">;

export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        // Phase 5b: 0.08em tracking, terracotta-500 default, masthead-style.
        "inline-block text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-terracotta-500)]",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
