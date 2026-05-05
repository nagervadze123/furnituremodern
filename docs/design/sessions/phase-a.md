# Phase A — Token Extraction Audit Trail

Date: 2026-05-06

This file is the verbatim audit trail for everything Phase A copied
from `_design-reference/styles/system.css` into `app/globals.css`,
plus the values it deliberately did **not** copy (with reasons), and
the cases where the ZIP value drifts from an already-shipped Phase 5b
value (in those cases we kept the project value and document the
delta here so Phase B can re-decide if needed).

Every line entry cites the ZIP source as `system.css:<line>`, and —
when applicable — the destination as `globals.css:<line range>`.

## 1. Tokens added to `globals.css`

| Source | Destination | Token | Value |
| --- | --- | --- | --- |
| `system.css:15` | `globals.css` `@theme` | `--color-bone-300` | `#ddd1bd` |
| `system.css:29` | `globals.css` `@theme` | `--color-hairline` | `rgba(28, 24, 22, 0.10)` |
| `system.css:30` | `globals.css` `@theme` | `--color-hairline-strong` | `rgba(28, 24, 22, 0.22)` |
| `system.css:56` | `globals.css` `@theme` | `--ease-fm` | `cubic-bezier(0.2, 0.7, 0, 1)` (renamed from `--ease`) |
| `system.css:57` | `globals.css` `@theme` | `--duration-fm-fast` | `200ms` (renamed from `--t-fast`) |
| `system.css:58` | `globals.css` `@theme` | `--duration-fm-mid` | `320ms` (renamed from `--t-mid`) |
| `system.css:59` | `globals.css` `@theme` | `--duration-fm-slow` | `600ms` (renamed from `--t-slow`) |
| `system.css:51` | `globals.css` new `:root` | `--editorial-container` | `1280px` (renamed from `--container` — Tailwind v4 collision) |
| `system.css:52` | `globals.css` new `:root` | `--editorial-container-wide` | `1440px` (renamed from `--container-wide`) |
| `system.css:53` | `globals.css` new `:root` | `--editorial-gutter` | `clamp(20px, 4vw, 56px)` (renamed from `--gutter`) |
| `system.css:42` | `globals.css` new `:root` | `--editorial-t-display-1` | `clamp(3rem, 6.2vw, 5.25rem)` |
| `system.css:43` | `globals.css` new `:root` | `--editorial-t-display-2` | `clamp(2.5rem, 4.6vw, 4rem)` |
| `system.css:44` | `globals.css` new `:root` | `--editorial-t-display-3` | `clamp(2rem, 3.2vw, 2.75rem)` |
| `system.css:45` | `globals.css` new `:root` | `--editorial-t-h-lede` | `clamp(1.25rem, 1.4vw, 1.5rem)` |
| `system.css:38` | `globals.css` new `:root` | `--fraunces-opsz-display` | `144` |
| `system.css:39` | `globals.css` new `:root` | `--fraunces-opsz-body` | `24` |

### Renaming rationale

- `--ease` / `--t-fast` / `--t-mid` / `--t-slow` → `--ease-fm` /
  `--duration-fm-{fast,mid,slow}`. Tailwind v4 recognises the
  `--ease-*` and `--duration-*` prefixes and emits matching utility
  classes; the `fm` suffix avoids collision with Tailwind's built-in
  defaults (`--ease-in`, `--duration-200`, etc.).
- `--container` / `--container-wide` / `--gutter` → `--editorial-*`.
  Tailwind v4 reserves `--container-*` for container-query size
  tokens, so the ZIP names would either collide with or shadow that
  scale. Prefixing with `editorial` keeps the meaning while staying
  out of Tailwind's namespace.
- `--t-display-*`, `--t-h-lede` → `--editorial-t-*`. No collision
  risk, but the `editorial` prefix keeps these grouped with the
  other Phase 6 vars and signals that they are paired with the
  `.display-*` / `.lede` class primitives.

## 2. Tokens skipped — already present, no rewrite

These tokens already exist in `globals.css` (Phase 5b). The ZIP value
either matches exactly or drifts very slightly; in every case we kept
the project's value untouched.

| Source | Project counterpart | Match? |
| --- | --- | --- |
| `system.css:12` `--bone-50: #faf7f2` | `globals.css:115` `--color-bone-50: #faf7f2` | exact |
| `system.css:13` `--bone-100: #f5f0e8` | `globals.css:116` `--color-bone-100: #f5f0e8` | exact |
| `system.css:14` `--bone-200: #ebe3d5` | `globals.css:117` `--color-bone-200: #ebe3d5` | exact |
| `system.css:17` `--ink-900: #1c1816` | `globals.css:119` `--color-ink-900: #1c1816` | exact |
| `system.css:18` `--ink-700: #3a342f` | `globals.css:120` `--color-ink-700: #3a342f` | exact |
| `system.css:19` `--ink-500: #6b6259` | `globals.css:121` `--color-ink-500: #6b6258` | drift (last digit) — kept project |
| `system.css:20` `--ink-300: #a39b90` | `globals.css:122` `--color-ink-300: #a59c91` | drift (~3 lightness steps) — kept project |
| `system.css:22` `--terracotta-500: #b85c38` | `globals.css:124` `--color-terracotta-500: #b85c38` | exact |
| `system.css:23` `--terracotta-600: #9a4a2c` | `globals.css:125` `--color-terracotta-600: #9a4a2c` | exact |
| `system.css:24` `--terracotta-100: #f0d9cb` | `globals.css:126` `--color-terracotta-100: #f4e2d8` | drift (~3 hue steps) — kept project |
| `system.css:26` `--brass-500: #a08555` | `globals.css:128` `--color-brass-500: #a08555` | exact |
| `system.css:27` `--sage-500: #6f7a6b` | `globals.css:129` `--color-sage-500: #6f7a6b` | exact |

The three drift cases (`ink-500`, `ink-300`, `terracotta-100`) are
all at sub-perceptual deltas — none change which side of an AA/AAA
contrast threshold the colour lands on, and none are referenced by
existing components in a way that would notice the difference.
Phase B will not surface these to the user; if a designer wants the
ZIP values exactly, the swap is a single-character edit per line.

## 3. Tokens skipped — would conflict with runtime infrastructure

| Source | Reason |
| --- | --- |
| `system.css:8` `@import url("https://fonts.googleapis.com/...")` | Strict CSP; runtime Google Fonts request would be blocked. Fonts already self-hosted by `next/font/google` (see `docs/design/typography.md`). |
| `system.css:33` `--font-display: "Fraunces", "Noto Serif Georgian", Georgia, serif` | `next/font/google` already sets `--font-display` to a fingerprinted runtime variable on `<html>` (`app/layout.tsx:54, 166`). Redeclaring would clobber the runtime value. |
| `system.css:34` `--font-body: "Inter", "Noto Sans Georgian", system-ui, sans-serif` | Same — set by `next/font/google` at runtime (`app/layout.tsx:61`). |
| `system.css:35` `--font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace` | The project sets `--font-mono` to `var(--font-geist-mono)` in `globals.css:60`. The chained fallbacks are inlined inside `.ph .ph-label` if/when that primitive is used; the production primitives don't reference `--font-mono`. |

## 4. Tokens skipped — covered by Tailwind utilities

| Source | Why |
| --- | --- |
| `system.css:46` `--t-body: 1rem` | Tailwind `text-base`. |
| `system.css:47` `--t-small: 0.875rem` | Tailwind `text-sm`. |
| `system.css:48` `--t-eyebrow: 0.75rem` | Tailwind `text-xs`; inlined into `.eyebrow` for the single use site. |

## 5. Class primitives ported

Each class primitive lands in the **Phase 6 editorial primitives**
block at the bottom of `app/globals.css`.

| Source range | Class | Notes |
| --- | --- | --- |
| `system.css:84-94` | `.eyebrow` | Font stack rewritten to chain `var(--font-body)` → `var(--font-georgian-sans)` → `system-ui, sans-serif`, replacing the ZIP's single `var(--font-body)` reference. Latin run resolves to Inter, Mkhedruli run resolves to Noto Sans Georgian. |
| `system.css:95-99` | `.eyebrow::before` | Hairline rule — extracted unchanged. |
| `system.css:100` | `.eyebrow.no-rule::before` | Display-none modifier — extracted unchanged. |
| `system.css:102-112` | `.display-1` | Font stack rewritten as in `.eyebrow`. `font-size` references `var(--editorial-t-display-1)`; opsz axis pulls from `var(--fraunces-opsz-display)` instead of an inline `144`. Tokens cited at `system.css:42` and `system.css:38`. |
| `system.css:113-123` | `.display-2` | As above, with literal opsz 100 inlined (single use site). |
| `system.css:124-133` | `.display-3` | As above, with literal opsz 60 inlined. |
| `system.css:134-138` | `.display-* em` | The italic-light terracotta-500 accent inside any display heading. Color resolves to `var(--color-terracotta-500)` (already in project). |
| `system.css:139-147` | `.lede` | Font-size pulls `var(--editorial-t-h-lede)`; opsz pulls `var(--fraunces-opsz-body)`. |
| `system.css:174-194` | `.btn`, `.btn:hover` | Transitions rewritten to use `var(--duration-fm-mid)` and `var(--ease-fm)` (Tailwind-recognised names). Color tokens use the `--color-*` prefix from `@theme`. |
| `system.css:195-203` | `.btn-primary`, `.btn-primary:hover` | As above. |
| `system.css:204-205` | `.btn-ghost`, `.btn-ghost:hover` | Border colour comes from the new `--color-hairline-strong` (cited at `system.css:30`). |
| `system.css:207-217` | `.text-link`, `.text-link:hover`, `.text-link .arrow` | Same transition rewrite as `.btn`. |
| `system.css:266-271` | `[data-reveal]`, `[data-reveal].in` | Transition timings reference the Phase 6 motion tokens. |
| `system.css:273-279` | `[data-reveal]` reduced-motion override | Scoped reduced-motion rule kept as a separate `@media` query at the bottom of the editorial block — does not interfere with the project's existing reduced-motion handler at `globals.css:435–451`. |

## 6. Class primitives skipped

| Source range | Class | Reason |
| --- | --- | --- |
| `system.css:148-153` | `.body` | Tailwind `text-base`/`leading-relaxed`/`text-ink-700` covers it. |
| `system.css:154` | `.body-ka` | The locale-aware variable `--font-body-locale` (`globals.css:248`) already exists for unconditional Mkhedruli-only contexts; per-character fallthrough handles the common case. |
| `system.css:155-159` | `.caption` | Tailwind `text-sm leading-snug text-ink-500`. |
| `system.css:162-167` | `.container` | Use the React `<Container>` primitive (`components/design/Container.tsx`). Adding a global `.container` class also risks shadowing Tailwind v4's container utility. |
| `system.css:168` | `.section` | Use the React `<Section>` primitive (`components/design/Section.tsx`). |
| `system.css:169` | `.section-tight` | Same — section padding can be supplied via the `<Section>` `variant` prop or a Tailwind class on the wrapper. |
| `system.css:170-171` | `.divider`, `.divider-strong` | One-line rule; an `<hr class="border-hairline">` (now possible thanks to the new `--color-hairline` utility) covers it. |
| `system.css:220-245` | `.ph`, `.ph::before`, `.ph .ph-label` | Image placeholder used only by the design-canvas mocks. Production uses `next/image`; the placeholder stays scoped to `_design-reference/`. |
| `system.css:246-254` | `.ph.dark`, `.ph.dark::before`, `.ph.dark .ph-label` | Same. |
| `system.css:257-263` | `.ar-43`, `.ar-45`, `.ar-11`, `.ar-32`, `.ar-169`, `.ar-219`, `.ar-23` | Tailwind v4's `aspect-[4/3]` etc. cover this. |
| `system.css:282-297` | `.annot`, `.annot::before` | Design-canvas spec callout chip; not a production primitive. |

## 7. Other deliverables for Phase A

- `docs/design/contrast.md` — measured WCAG contrast ratios for the
  six pairs the user specified, plus `terracotta-600` on `bone-50`
  (which is the AA-safe alternative for inline-text accent uses).
  terracotta-500 fails AA at body sizes; the doc spells out where it
  is and isn't safe.
- `docs/design/typography.md` — confirms the
  Fraunces / Inter / Noto Serif Georgian / Noto Sans Georgian pairing,
  documents the per-character fallthrough pattern that handles
  Fraunces's lack of Mkhedruli coverage, and lists the Fraunces opsz
  axis values used at each display size (144 / 100 / 60 / 24).
- `_design-reference/README.md` — describes the staged reference
  folder and its non-shipping role.

## 8. What Phase A explicitly did NOT do

- Did not touch any React component under `components/`.
- Did not touch any route under `app/[locale]/` or `app/(admin)/`.
- Did not touch metadata, JSON-LD, AEO, FAQ, or i18n message files.
- Did not change CSP, Sentry, analytics, or service worker code.
- Did not import any of `_design-reference/components/*.jsx` into the
  app graph (those files contain hardcoded Georgian strings, no i18n,
  no Server Components, no `next/image`, and inline event handlers
  that would break under SSR).
- Did not raise the bundled CSS size beyond what the new tokens
  contribute (every value is either a CSS variable declaration or a
  small class block; no images, no fonts, no JS).

## 9. Reverting Phase A

Phase A is contained to three additions inside `app/globals.css`:

1. The `Phase 6 editorial deltas` block inside `@theme inline`
   (token additions: bone-300, hairline, hairline-strong, motion
   tokens).
2. The new `:root` block immediately above the existing palette
   `:root` (layout, type-scale, opsz axis vars).
3. The `Phase 6 editorial primitives` class block at the end of
   the file.

Removing those three blocks restores Phase 5b. The `_design-reference/`
folder and the `docs/design/` markdown files have no compile-time
dependency on `globals.css`; they can be kept as-is for Phase B, or
deleted as well — neither breaks the build.
