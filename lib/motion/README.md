# lib/motion — motion primitives

Animation primitive layer for the design system. Components import from `@/lib/motion` to get reveal-on-scroll, staggered reveal, parallax, plus the underlying duration / easing / variant tokens used to build any custom animation.

## Decision: CSS-only (framer-motion **out**)

After the Phase 5 Task 1 bundle audit (May 4, 2026), framer-motion is **out**.

**The numbers:** A probe route that consumed `<Reveal>`, `<RevealStagger>`, and `<Parallax>` simultaneously caused the production client bundle (gzipped, summed across all chunks) to grow from **573.3 KB → 602.7 KB** — a delta of about **30 KB**, of which ~28 KB was a single new framer-motion chunk attached to the consuming route. That exceeds the project's 20 KB budget.

**What we ship instead:** plain CSS transitions driven by an IntersectionObserver hook (`useInViewOnce`). The reveal animation runs on the GPU with zero JS animation library. The same API is preserved — `<Reveal>`, `<RevealStagger>`, `<Parallax>` — and the duration / easing / variant tokens are unchanged.

**What we lose:** framer-motion's spring physics, declarative variant orchestration, and built-in scroll-linked motion values. The project doesn't need any of those for a furniture catalogue.

**Re-evaluating later:** if a future Phase 5 task genuinely needs spring physics or complex orchestration, re-run the probe with that scope. The threshold is the only conversation worth having.

## Exports

### Tokens (server-safe)

- `DURATIONS` — `{ fast, base, slow, slower, lazy }` in milliseconds
- `seconds(name)` — convert a duration name to seconds
- `EASINGS` — `{ standard, enter, exit, emphasis, spring }`. Cubic-bezier 4-tuples + a spring config object.
- Variants — `fadeIn`, `slideUp`, `scaleIn`, `imageReveal`, each as `{ hidden, visible, durationMs, easing }`.
- `slideUpStagger` — `{ staggerMs, delayChildrenMs, maxStaggerSlots }`. Used by `<RevealStagger>` for cascade timing.

### Hooks (`"use client"`)

- `useReducedMotion(): boolean` — SSR-safe wrapper around `matchMedia("(prefers-reduced-motion: reduce)")`. Always `false` on the server.
- `useInViewOnce(threshold = 0.2): { ref, inView }` — one-shot IntersectionObserver. Disconnects after the first reveal.
- `useScrollProgress(): { ref, progress }` — 0..1 scroll progress through the viewport.

### Components (`"use client"`)

- `<Reveal variant="slideUp" as="div">` — animates children once when scrolled into view via inline-style transition. Supports `fadeIn`, `slideUp`, `scaleIn`, `imageReveal`.
- `<RevealStagger>` — parent wrapper that toggles the `fm-stagger` / `fm-stagger-revealed` classes; the actual cascade is implemented by per-slot CSS rules in `app/globals.css`.
- `<Parallax maxOffset={40}>` — subtle vertical translation as the element moves through the viewport. Hard cap at 60 px.

### Reduced-motion behavior

Every animated component reads `useReducedMotion()` and renders its children **statically** (no transition style, no observer, no CSS class) when set. Combined with the global `@media (prefers-reduced-motion: reduce)` block in `app/globals.css`, reduced-motion users get instant motion on every animation surface in the app.

## Adding a new animation

1. Add to `durations.ts` / `easings.ts` / `variants.ts` if a new primitive value is needed.
2. New components live in `components.tsx`. Branch on `useReducedMotion()` first; otherwise apply the variant's hidden/visible style via inline style with a CSS `transition` rule.
3. If the orchestration needs CSS, add it to the `lib/motion stagger reveal` section in `app/globals.css`.
4. Mock `./hooks` in tests; assert the JSX tree via element introspection (no DOM — vitest runs in node env).
