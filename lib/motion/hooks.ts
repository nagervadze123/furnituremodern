"use client";

// Motion hooks. SSR-safe — every hook returns a sensible default during
// server render (`false` for reduced-motion, no-op refs for observers)
// so client-side hydration is the moment when the real values take
// effect. This keeps the framework happy and avoids hydration warnings.

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

/**
 * Returns `true` when the user has requested reduced motion. SSR-safe:
 * always `false` until the first client effect runs. We don't proxy to
 * framer-motion's hook because we want this available on routes that
 * don't import any framer-motion features (CSS-only animations, View
 * Transitions, etc.).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    // addEventListener isn't supported on every Safari version; the
    // legacy addListener fallback is intentional, not a mistake.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return reduced;
}

/**
 * One-shot intersection-observer reveal. Pairs with framer-motion
 * variant animations: when the ref'd element scrolls into view past
 * `threshold`, `inView` flips to `true` and stays there. Useful for
 * fade-in-on-scroll panels that should only animate the first time.
 *
 * Default threshold is `0.01` — fire the moment any pixel of the
 * observed element enters the viewport. This clears the "1-second
 * visible empty-space gap" reported on the homepage with the older
 * 0.2 default: a tall section (FeaturedCategories) needed 20% of
 * its height (~300 px) scrolled into view before the reveal fired,
 * which read as a beat of dead space after the hero.
 *
 * Per-callsite overrides (0.05–0.15) tune individual reveals
 * intentionally and are unaffected.
 */
export function useInViewOnce(threshold = 0.01): {
  ref: MutableRefObject<HTMLElement | null>;
  inView: boolean;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older browsers (or environments without the API): mark in-view
      // immediately so the content is at least visible — graceful
      // degradation rather than silently broken animations. Deferred
      // via queueMicrotask so the setState lands in a separate React
      // task rather than firing synchronously inside the effect body.
      queueMicrotask(() => setInView(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/**
 * Returns a ref-callback / 0-1 progress pair tracking how far the
 * referenced element has scrolled through the viewport. 0 when the top
 * of the element is at the bottom of the viewport, 1 when the bottom
 * of the element is at the top of the viewport.
 *
 * Implemented with the IntersectionObserver + scroll listener pattern
 * rather than framer-motion's useScroll so the hook is usable on
 * routes that don't otherwise import framer-motion. Callers that want
 * the framer-motion MotionValue can wrap with `useTransform`.
 */
export function useScrollProgress(): {
  ref: MutableRefObject<HTMLElement | null>;
  progress: number;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const onScroll = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Distance from element top to viewport bottom, normalized to
      // the element's full reveal range (height + viewport height).
      const range = rect.height + vh;
      const traveled = vh - rect.top;
      const clamped = Math.max(0, Math.min(1, traveled / range));
      setProgress(clamped);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress };
}
