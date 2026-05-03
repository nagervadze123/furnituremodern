// CSS-only motion variants. Each entry pairs a `hidden` and `visible`
// snapshot of CSS properties with a duration + easing tuple. The
// components in lib/motion/components.tsx interpolate between the two
// using a CSS `transition` rule rather than a JS animation library.
//
// Why CSS-only: framer-motion 12 added ~28 KB gz to a route's First
// Load JS in the Phase 5 audit (May 4, 2026), over the project's
// 20 KB budget. CSS transitions deliver the same simple reveal
// animations at zero JS cost. See lib/motion/README.md for the audit.

import type { CSSProperties } from "react";

import { DURATIONS } from "./durations";
import { EASINGS } from "./easings";

type Cubic = readonly [number, number, number, number];

export type CSSVariant = {
  hidden: CSSProperties;
  visible: CSSProperties;
  durationMs: number;
  easing: Cubic;
};

export const fadeIn: CSSVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  durationMs: DURATIONS.slow,
  easing: EASINGS.standard,
};

export const slideUp: CSSVariant = {
  hidden: { opacity: 0, transform: "translateY(24px)" },
  visible: { opacity: 1, transform: "translateY(0)" },
  durationMs: DURATIONS.slow,
  easing: EASINGS.enter,
};

export const scaleIn: CSSVariant = {
  hidden: { opacity: 0, transform: "scale(0.96)" },
  visible: { opacity: 1, transform: "scale(1)" },
  durationMs: DURATIONS.slow,
  easing: EASINGS.standard,
};

export const imageReveal: CSSVariant = {
  hidden: { clipPath: "inset(100% 0 0 0)" },
  visible: { clipPath: "inset(0 0 0 0)" },
  durationMs: DURATIONS.slower,
  easing: EASINGS.emphasis,
};

/**
 * Stagger metadata for `<RevealStagger>`. Children reveal in cascade —
 * each child's transition-delay is `staggerMs * (childIndex + 1)`,
 * starting after `delayChildrenMs`. The CSS that implements the
 * cascade lives in app/globals.css under the `.fm-stagger` class so
 * the stagger pattern can be reused via class alone.
 */
export const slideUpStagger = {
  staggerMs: 80,
  delayChildrenMs: 40,
  /** Maximum number of distinct delay slots before flattening to one delay. */
  maxStaggerSlots: 8,
} as const;
