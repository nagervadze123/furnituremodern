// Editorial tag / badge. Phase 6 Slice 6 D1 — landed alongside its
// first consumer (the product card's "new" badge in
// `components/sections/product-card.tsx`).
//
// Two variants:
//
//   • 'new'     — bone-50 on terracotta-600 (5.80:1, AA-clear for
//                 body-size text). Why terracotta-600 and not
//                 terracotta-500: bone-50 on terracotta-500 measures
//                 4.25:1 — that satisfies SC 1.4.11's 3:1 UI carve-
//                 out, but a Tag is a passive informational label
//                 (not an interactive UI component), so the strict
//                 SC 1.4.3 4.5:1 body-text floor applies. Sliding
//                 to terracotta-600 clears that floor cleanly and
//                 follows the same Slice 0 / Slice 4 substitution
//                 pattern (terracotta-600 = inline-text + body-size
//                 accent). Used on products whose `createdAt` is
//                 within the last 30 days, surfaced via
//                 `isNewProduct(...)`.
//   • 'neutral' — ink-700 on bone-100, hairline bone-200 border.
//                 No terracotta touch. The default for any tag
//                 that is not the "new" callout.
//
// Distinct from `components/ui/badge.tsx` (the shadcn primitive).
// The shadcn badge follows the shadcn theme system (foreground /
// muted / accent tokens); the editorial Tag paints the Phase 6
// palette directly via CSS variables. Both stay in their lanes;
// the existing shadcn badge keeps every shadcn-side consumer.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASS = {
  new: "bg-[var(--color-terracotta-600)] text-[var(--color-bone-50)]",
  neutral:
    "bg-[var(--color-bone-100)] text-[var(--color-ink-700)] border border-[var(--color-bone-200)]",
} as const;

export type TagVariant = keyof typeof VARIANT_CLASS;

type TagProps = {
  variant?: TagVariant;
  className?: string;
  children: ReactNode;
};

export function Tag({ variant = "neutral", className, children }: TagProps) {
  return (
    <span
      className={cn(
        // 0.18em tracking + uppercase + 12px / weight 500 mirror the
        // editorial eyebrow voice. rounded-none keeps the editorial
        // sharp-edge contract; px-2 py-1 reads as a tight pill, not
        // a button.
        "inline-flex items-center rounded-none px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Predicate for the "new" variant. Reads the operator-controlled
// `isNew` flag straight off the product (sourced from the Supabase
// `products.is_new` column added in Slice 6's follow-up migration
// `add_is_new_to_products`). Editorial control is intentional:
// "new" stays meaningful only when the operator can decide what
// counts and when it stops counting — a date-derived heuristic
// would auto-graduate items out of the badge regardless of CMS
// intent. The offline TS catalogue does not set the field, so its
// products read as not-new — the manual flag has no offline
// equivalent and that asymmetry is deliberate.
export function isNewProduct(product: { isNew?: boolean }): boolean {
  return product.isNew === true;
}
