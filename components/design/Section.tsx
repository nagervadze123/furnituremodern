// Vertical-rhythm wrapper. Renders a <section> with consistent
// top/bottom padding so adjacent sections stack with predictable
// breathing room. Variants:
//
//   • default — most catalogue / editorial sections
//   • large   — emphasized sections (featured collections, brand story)
//   • hero    — full-height first impression on landing pages
//
// Optional `aria-labelledby` makes the section a named landmark for
// assistive tech; pair with a heading element whose `id` matches.

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  default: "py-22",
  large: "py-30",
  hero: "py-44",
} as const;

export type SectionVariant = keyof typeof VARIANT_CLASS;

type SectionProps = ComponentPropsWithoutRef<"section"> & {
  variant?: SectionVariant;
};

export function Section({
  variant = "default",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn(VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </section>
  );
}
