"use client";

// CSS-only motion primitives. Each component runs an
// IntersectionObserver via the lib/motion/hooks helpers and toggles a
// data attribute (or inline style) the moment its element enters the
// viewport. The actual transition runs on the GPU through a CSS
// transition declared on the element — no animation library.
//
// Reduced-motion users always see the children rendered statically.
// We branch BEFORE applying any transition style so the user pays no
// cost (no transition listeners, no observers driving paint) when
// they've asked for instant motion.

import type { CSSProperties, ReactNode } from "react";

import { useInViewOnce, useReducedMotion, useScrollProgress } from "./hooks";
import {
  fadeIn,
  imageReveal,
  scaleIn,
  slideUp,
  slideUpStagger,
} from "./variants";
import type { CSSVariant } from "./variants";

const VARIANT_MAP = {
  fadeIn,
  slideUp,
  scaleIn,
  imageReveal,
} as const;

export type RevealVariantName = keyof typeof VARIANT_MAP;

type SimpleTag = "div" | "section" | "article" | "ul" | "ol" | "li" | "span";

const cubic = (c: readonly number[]) => `cubic-bezier(${c.join(",")})`;

function combineStyles(
  base: CSSProperties | undefined,
  variant: CSSVariant,
  inView: boolean
): CSSProperties {
  return {
    ...base,
    ...(inView ? variant.visible : variant.hidden),
    transition: `opacity ${variant.durationMs}ms ${cubic(
      variant.easing
    )}, transform ${variant.durationMs}ms ${cubic(
      variant.easing
    )}, clip-path ${variant.durationMs}ms ${cubic(variant.easing)}`,
    willChange: inView ? "auto" : "transform, opacity, clip-path",
  };
}

type RevealProps = {
  children: ReactNode;
  variant?: RevealVariantName;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  as?: SimpleTag;
};

/**
 * Intersection-observer reveal. Renders a single element that swaps
 * from the variant's `hidden` style to its `visible` style the first
 * time the element scrolls into view. CSS handles the transition.
 */
export function Reveal({
  children,
  variant = "slideUp",
  threshold = 0.2,
  className,
  style,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInViewOnce(threshold);
  const v = VARIANT_MAP[variant];

  if (reduced) {
    const Static = as;
    return (
      <Static className={className} style={style}>
        {children}
      </Static>
    );
  }

  const Tag = as;
  const targetStyle = combineStyles(style, v, inView);
  return (
    <Tag
      ref={ref as React.Ref<HTMLElement> as React.Ref<never>}
      className={className}
      style={targetStyle}
    >
      {children}
    </Tag>
  );
}

type RevealStaggerProps = {
  children: ReactNode;
  threshold?: number;
  className?: string;
  as?: SimpleTag;
};

/**
 * Parent wrapper for staggered child reveal. Adds `fm-stagger` and
 * `fm-stagger-revealed` class names that are interpreted by the
 * `.fm-stagger > *:nth-child(n)` rules in app/globals.css. Children
 * don't need to be `<Reveal>` — any direct child gets the cascade.
 */
export function RevealStagger({
  children,
  threshold = 0.2,
  className,
  as = "div",
}: RevealStaggerProps) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInViewOnce(threshold);
  const Tag = as;

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  const cls = [
    "fm-stagger",
    inView ? "fm-stagger-revealed" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement> as React.Ref<never>}
      className={cls}
      style={{
        // Surface the stagger metadata as CSS variables so designers
        // can tweak per-instance via inline style without touching
        // globals.css.
        ["--fm-stagger-step" as string]: `${slideUpStagger.staggerMs}ms`,
        ["--fm-stagger-delay" as string]: `${slideUpStagger.delayChildrenMs}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

type ParallaxProps = {
  children: ReactNode;
  /** Maximum vertical translation in pixels. Hard-capped at 60. */
  maxOffset?: number;
  className?: string;
};

/**
 * Subtle parallax on a child element. Pure JS (scroll listener +
 * transform) — no library dependency. Reduced-motion users see the
 * children rendered statically.
 */
export function Parallax({ children, maxOffset = 40, className }: ParallaxProps) {
  const reduced = useReducedMotion();
  const { ref, progress } = useScrollProgress();
  const cap = Math.min(60, Math.max(0, maxOffset));

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  // (progress - 0.5) * cap * 2 — at progress 0 → -cap, at 1 → +cap.
  const offset = (progress - 0.5) * cap * 2;

  return (
    <div
      ref={ref as React.Ref<HTMLElement> as React.Ref<never>}
      className={className}
      style={{
        transform: `translate3d(0, ${offset.toFixed(2)}px, 0)`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
