"use client";

// Lazy mount-point for the WebGL armchair scene.
//
// Why a client wrapper instead of importing Showcase3DCanvas straight
// into Showcase3D.tsx?
//   1. next/dynamic with `ssr: false` is only legal in client modules;
//      the Next 16 docs explicitly say so. We need ssr:false because
//      three.js touches `document`/`window` at import time.
//   2. We want the heavy three.js + r3f bundle (~280 KB gzipped) to
//      stay out of the initial home-page JS payload — only loaded
//      after the section scrolls into view.
//   3. prefers-reduced-motion users get a tasteful static fallback
//      (no canvas mount, no GPU work).

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

const Showcase3DCanvas = dynamic(
  () => import("./Showcase3DCanvas").then((mod) => mod.Showcase3DCanvas),
  {
    ssr: false,
    loading: () => <Skeleton />,
  }
);

export function Showcase3DLazy() {
  const reduced = useReducedMotion();
  // We only mount the canvas once the section has scrolled into view,
  // so users who never reach this strip don't pay for the three.js
  // download at all. Browsers without IntersectionObserver — vanishingly
  // rare today — get the canvas immediately; we resolve that once at
  // initial-state time so we don't need a setState-in-effect fallback.
  const [shouldMount, setShouldMount] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined"
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return; // Static fallback handles this case.
    if (shouldMount) return; // Already mounted — nothing to observe.
    if (!sentinelRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [reduced, shouldMount]);

  if (reduced) {
    return <ReducedMotionFallback />;
  }

  return (
    <div
      ref={sentinelRef}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-surface-200)] via-[var(--color-surface-100)] to-[var(--color-accent-soft,oklch(0.92_0.04_38))] shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)] sm:aspect-[3/2] md:aspect-[5/4]"
    >
      {shouldMount ? (
        <CanvasErrorBoundary>
          <Showcase3DCanvas />
        </CanvasErrorBoundary>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}

// Defense-in-depth: contains any runtime error from three.js / r3f
// inside this component instead of bubbling up to the root error
// boundary, which would otherwise replace the entire page with the
// "Something went wrong" fallback. If the canvas blows up, the
// section falls back to the same static SVG silhouette that
// reduced-motion users see.
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    if (typeof console !== "undefined") {
      console.warn("[Showcase3D] canvas threw, falling back to SVG", error);
    }
  }
  render() {
    if (this.state.hasError) {
      return <ChairSilhouette />;
    }
    return this.props.children;
  }
}

function Skeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        aria-hidden="true"
        className="h-12 w-12 animate-pulse rounded-full bg-[var(--color-accent-soft,oklch(0.92_0.04_38))]"
      />
    </div>
  );
}

function ReducedMotionFallback() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-surface-200)] via-[var(--color-surface-100)] to-[var(--color-accent-soft,oklch(0.92_0.04_38))] shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)] sm:aspect-[3/2] md:aspect-[5/4]">
      <ChairSilhouette />
    </div>
  );
}

function ChairSilhouette() {
  return (
    <svg
      viewBox="0 0 200 160"
      aria-hidden="true"
      className="absolute inset-0 m-auto h-2/3 w-2/3 text-[var(--color-ink-40)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Stylised armchair silhouette — same visual cue as the live
          canvas but pure SVG, so reduced-motion users (and any future
          runtime crash) still see the "we make furniture" beat. */}
      <path d="M50 110 v-50 a14 14 0 0 1 14 -14 h72 a14 14 0 0 1 14 14 v50" />
      <path d="M40 110 h120 v22 a4 4 0 0 1 -4 4 h-112 a4 4 0 0 1 -4 -4 z" />
      <line x1="54" y1="136" x2="54" y2="150" />
      <line x1="146" y1="136" x2="146" y2="150" />
      <path d="M50 110 a8 8 0 0 0 -10 0" />
      <path d="M150 110 a8 8 0 0 1 10 0" />
    </svg>
  );
}
