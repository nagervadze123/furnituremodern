// Header scroll-state controller. Adds `data-scrolled="true"` to the
// nearest <header> ancestor once `window.scrollY > THRESHOLD`. The
// header CSS reacts to that attribute (background, blur, padding) —
// React state never re-renders on scroll.
//
// Why an effect instead of an IntersectionObserver-of-sentinel:
//   • A sentinel element pinned at y=80 would fire when it leaves the
//     viewport, but we also need the inverse — scroll back up to 0 and
//     remove the class. With a single observer + isIntersecting check,
//     the API works but it's slightly more code than a raf-throttled
//     scroll listener with one threshold compare.
//   • Throttling via requestAnimationFrame keeps us at the browser's
//     paint rate (≤ 60 toggles/sec) instead of one toggle per scroll
//     event (which on some trackpads is hundreds per second).
//
// The effect is fully client-side and renders nothing.

"use client";

import { useEffect } from "react";

const SCROLL_THRESHOLD = 80;

type Props = {
  /** Selector of the header element to update. Defaults to `[data-site-header]`. */
  selector?: string;
};

export function HeaderScrollEffect({
  selector = "[data-site-header]",
}: Props) {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(selector);
    if (!header) return;

    let ticking = false;
    let last: boolean | null = null;

    const apply = () => {
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      if (scrolled !== last) {
        header.dataset.scrolled = scrolled ? "true" : "false";
        last = scrolled;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(apply);
      }
    };

    // Run once on mount in case the user lands on a page already
    // scrolled (back-forward navigation, deep link with hash, etc.).
    apply();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [selector]);

  return null;
}
