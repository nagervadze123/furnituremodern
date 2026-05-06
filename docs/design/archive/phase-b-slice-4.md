# Phase B Slice 4 — terracotta-500 contrast sweep

Isolated accessibility fix for the three remaining body-size
`terracotta-500` paints flagged at the start of Phase B. Decoupled
from the homepage visual port (now Slice 5) so the contrast bug
ships ahead of the larger editorial work, and so git bisect on a
future contrast regression points at a small, focused commit.

## Branch

`phase-b/4-terracotta-sweep`

## Why a separate slice

Accessibility fixes and visual ports are different concerns:

- **Different reviewers care about different things.** A
  contrast-only PR is a quick AA-sanity diff. A homepage port PR is
  a typography + layout review. Bundling them makes both reviews
  worse.
- **Different blocking levels.** The contrast offenders ship a real
  WCAG AA failure today; the homepage port does not. Decoupling
  lands the fix sooner.
- **Slice 0 set the precedent.** Eyebrow + VisitStrip got their own
  ~20-line slice. The remaining three offenders deserve the same
  treatment.

## Files touched

### Modified

- `components/home/FeaturedCategories.tsx:187` — link hover/focus
  `text-[var(--color-terracotta-500)]` →
  `text-[var(--color-terracotta-600)]`. Body-size inline link on
  bone-50; per `docs/design/contrast.md`, terracotta-600 is the
  canonical AA-clear (5.80:1) substitution for inline-text accent.
- `components/home/FeaturedCollection.tsx:105` — same substitution.
- `app/globals.css` `.text-link:hover` — `color` and
  `border-bottom-color` from `var(--color-terracotta-500)` →
  `var(--color-ink-900)`. The resting state already paints ink-900,
  so the practical effect is "no color shift on hover, gap + arrow
  animations remain." Verified zero production consumers via
  `grep -rn '\btext-link\b' --include='*.tsx' app/ components/`
  before changing.
- `docs/design/contrast.md` — append a "Phase 6 Slice 4 sweep"
  section cataloguing the three substitutions and the remaining
  intentional decorative `terracotta-500` occurrences (display em
  accents, `.btn-primary` fill, eyebrow `::before` hairline,
  focus-visible rings on `FeaturedCategories` / `SignatureProducts`,
  `editorialPrimary` button variant fill, `.eyebrow::before` rule).

### Net-new

- `components/home/FeaturedCategories.test.tsx` — focused
  element-tree test asserting the link's resolved className contains
  `text-[var(--color-terracotta-600)]` on hover/focus and never
  contains `text-[var(--color-terracotta-500)]`. Mocks
  `next-intl/server`, the locale-aware `Link` export, and any
  data-layer dependency that imports `server-only`.

### Extended

- `components/home/FeaturedCollection.test.tsx` — add the same
  pair of token-anchored assertions to the existing test file.

## Test pattern

Token-anchored regression guards following Slice 0
(`components/design/design.test.tsx:165-168`): assert the resolved
CSS variable token in the className substring. Vitest runs in
`environment: "node"` (no DOM, no `getComputedStyle`), so the most
deterministic guard available is locking the literal Tailwind
arbitrary-value class that compiles to the named CSS variable.

```ts
expect(linkClass).toContain("text-[var(--color-terracotta-600)]");
expect(linkClass).not.toContain("text-[var(--color-terracotta-500)]");
```

## Out of scope

- The visual port of `FeaturedCategories` and `FeaturedCollection`
  (typography, layout, eyebrows, image treatment, magazine
  composition). That belongs to Slice 5 (homepage body).
- Removing the `.text-link` class definition. The class stays
  available; Slice 5 / 6 may consume it now that the hover paints
  ink-900 and clears AA on bone-50.
- Hover-state polish on the Slice-3 footer brass links — those
  already measured 5.02:1 on ink-900 and need no change.

## Acceptance

1. `grep -rn 'hover:text-\[var(--color-terracotta-500)\]'` returns
   zero matches across `app/` and `components/`.
2. No `var(--color-terracotta-500)` reference inside any `:hover`
   block in `app/globals.css`.
3. New / extended tests assert the substituted token explicitly
   (positive `terracotta-600` / `ink-900` assertion + negative
   `terracotta-500` assertion).
4. `docs/design/contrast.md` "Phase 6 Slice 4 sweep" section lists
   the three substitutions made plus the post-sweep grep output —
   every remaining `terracotta-500` mention is annotated as a
   comment, a token definition, a permitted decorative surface,
   or a permitted display-step accent.
5. `bash scripts/phase-b-checks.sh` clean (all 5 invariants).
6. `npm run lint` clean, `npm test` clean (full suite),
   `npm run build` clean.

## Protected surfaces (per phase-b.md)

- **JSON-LD** — no schema generators touched.
- **i18n** — no new keys added; no key renames; no string changes.
- **CSP** — no new origins; no remote font fetches; nonce threading
  unchanged.
- **Consent / analytics** — banner + analytics-loader gate
  untouched.
- **Observability** — no Sentry, web-vitals, page-view, SW changes.
- **Server-component default** — no new `'use client'` boundaries
  introduced (existing client islands like `HeaderScrollEffect`,
  `LanguageSwitcher`, `ManageLink` remain unchanged).
- **Performance** — LCP element on home / category / PDP keeps its
  `priority` flag; CSS bundle delta is one swap of one CSS variable
  inside `.text-link:hover` plus two Tailwind class swaps. No
  measurable bundle impact.
