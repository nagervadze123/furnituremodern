// Small uppercase label that sits above headings ("Featured", "New",
// "Limited edition"). Maps to the `caption` typography token —
// 0.75rem, generous tracking. Renders inline (a span) so it can sit
// before, beside, or above a heading without forcing a block break.
//
// Phase 6 Slice 0 — default text colour is `ink-500` (5.59:1 on
// bone-50, AA-clear). The terracotta-500 paint that lived here in
// Phase 5b failed AA at 12 px (4.25:1). The brand accent at body
// size now lives in the 1 px terracotta hairline emitted by the
// `.eyebrow` class in `app/globals.css` — see
// `docs/design/contrast.md` for the canonical rule.

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type EyebrowProps = ComponentPropsWithoutRef<"span">;

export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-ink-500)]",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
