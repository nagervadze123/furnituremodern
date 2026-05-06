# Phase B — Editorial Visual Port

Phase B ports the claude.ai/design export into the existing
`furnituremodern` components, preserving every metadata, JSON-LD,
i18n, CSP, consent, and observability surface from Phase 5b.

This document is the canonical plan + decision log + workflow
contract. It supersedes any conflicting notes in earlier session
transcripts.

## Workflow contract

- One slice = one branch (`phase-b/<n>-<slug>`) = one PR.
- After each slice's PR is pushed, work stops until the user reviews
  and approves. The autopush-to-main rule from
  `feedback_furnituremodern_autopush.md` is paused for slice work
  (the rule's own carve-out — "the user is actively iterating on
  something that may revise the change" — applies). Documentation
  and tooling commits that aren't slice content still autopush to
  main.
- Each PR opens against `main`, waits for the user, and merges via
  GitHub.
- After merge, the next slice branches from a freshly pulled `main`.

## Slice list

| # | Slice | Branch |
| --- | --- | --- |
| 0 | Eyebrow contrast fix | `phase-b/0-eyebrow-contrast` |
| 1 | Breadcrumbs visual port | `phase-b/1-breadcrumbs` |
| 2 | Header + IssueRibbon (deletes EyebrowNav) | `phase-b/2-header-issue-ribbon` |
| 3 | Footer | `phase-b/3-footer` |
| 4 | terracotta-500 contrast sweep | `phase-b/4-terracotta-sweep` |
| 5 | Homepage body | `phase-b/5-homepage-body` |
| 6 | Category body | `phase-b/6-category-body` |
| 7 | PDP body | `phase-b/7-product-body` |
| 8 | Polish + delete `_design-reference/` | `phase-b/8-polish` |

## Decisions taken before Slice 0

### D1 — primitives ship with first consumer (no library PR)

There is no standalone "primitives" slice. Every new design primitive
lands in the same PR as its first consumer:

- **EditorialButton variants** (CVA-extended `components/ui/button.tsx`) → Slice 2
- **SectionMarker** → Slice 2 (consumed by IssueRibbon)
- **EditorialHeading** with `variant: 'hero' | 1 | 2 | 3'` → Slice 5
- **AspectFrame** → Slice 5
- **Tag** with `variant: 'new' | 'neutral'` → Slice 6
- **Specs** (if extracted) → Slice 7

### D2 — one Button file, multiple visual contracts

`components/ui/button.tsx` (the shadcn Button) is the single source
of truth for **all** button styling — admin and editorial. New
visual variants extend the existing CVA `variants` block; no
`EditorialButton.tsx` file is created.

Three layers of enforcement:

1. **Comment block** at the top of `components/ui/button.tsx`
   declaring the rule and forbidding regeneration via
   `npx shadcn add button`.
2. **Precommit grep check** — `git ls-files '**/[A-Z]*Button.tsx'`
   must return empty (the existing kebab-case admin action buttons
   like `delete-product-button.tsx` are domain wrappers, not visual
   variants, and don't trigger).
3. **PR-checklist line** in this document (see _Per-PR
   checklist_ below).

### D3 — EyebrowNav deletes in Slice 2

`components/home/EyebrowNav.tsx` and `components/home/EyebrowNav.test.tsx`
both delete in Slice 2 alongside IssueRibbon's introduction.
EyebrowNav has a single home-page consumer
(`app/[locale]/page.tsx:146`); IssueRibbon is a 5-link superset
covering EyebrowNav's three anchor targets (`/sofas`, `#workshop`,
`#visit`) plus the new editorial Featured + Recent works sections.

Doc references in `BrandStory.tsx`, `FeaturedCategories.tsx`, and
`VisitStrip.tsx` update to "IssueRibbon" in the same Slice 2 PR.

i18n key migration in Slice 2 PR:
`messages/{ka,en}.json: home.eyebrow_nav.*` →
`messages/{ka,en}.json: home.issue_ribbon.*`, with the additional
Featured / Recent works keys added.

### D4 — EditorialHeading hero variant baked into the API

`EditorialHeading` accepts `variant: 'hero' | 1 | 2 | 3'`. `'hero'`
is a distinct step (not an override prop): it applies a new
`.display-hero` CSS class with `font-size: clamp(3.5rem, 7vw, 6.5rem)`
and `font-variation-settings: "opsz" 144`. The class lands in
`app/globals.css` in the same Slice 5 PR that introduces
`EditorialHeading`.

API shape (Slice 5):

```ts
type EditorialHeadingProps = {
  variant: 'hero' | 1 | 2 | 3;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};
```

No `sizeOverride` escape hatch. New sizes get new variant values.

### D5 — three open answers from the plan

- **Issue number** in IssueRibbon — hardcoded behind a
  `messages/{ka,en}.json` key (e.g.
  `home.issue_ribbon.issue: "№06 · 2026"`). No `siteConfig` field.
- **Hero image** in Slice 5 — picked from
  `scripts/stock-photos-prepared/` curated library. Selection
  documented in the Slice 5 PR description.
- **`_design-reference/` lifetime** — `git rm -r _design-reference/`
  in Slice 8, alongside an `_design-reference/` entry in `.gitignore`
  that stays permanently.

## Per-PR checklist

Every Phase B PR must check off every item before merge:

- [ ] `npm run lint` clean
- [ ] `npm test` clean (all suites)
- [ ] `npm run build` clean (only the expected Sentry-auth-token warning)
- [ ] `bash scripts/phase-b-checks.sh` clean (zero matches across all 5 checks)
- [ ] No new visual-variant `*Button.tsx` file added (D2)
- [ ] No production component imports from `_design-reference/`
- [ ] No new `<link>` to fonts.googleapis.com / fonts.gstatic.com
- [ ] No new inline `onMouseEnter` / `onMouseLeave` handlers (use
  CSS `:hover`)
- [ ] CSP-Report-Only endpoint has no new violations after a manual
  smoke test on the affected routes
- [ ] Existing JSON-LD blocks (`Organization`, `WebSite`, `WebPage`,
  `LocalBusiness`, `FAQPage`, `BreadcrumbList`, `CollectionPage`,
  `ItemList`, `Product`) emit identical shapes pre- and post-slice
- [ ] All visible strings flow through `next-intl`; new keys exist
  in both `messages/ka.json` and `messages/en.json`
- [ ] All images go through `next/image` (no `.ph` placeholder
  classes, no raw `<img>` tags except in OG / Satori contexts)
- [ ] Server components stay server; new `'use client'` boundaries
  are justified in the PR description
- [ ] Cookie consent + analytics-loader gate untouched
- [ ] Sentry instrumentation, `<WebVitalsReporter>`, `<PageViewTracker>`,
  `<ServiceWorkerRegister>` all still wired
- [ ] terracotta-500 paint check (per `docs/design/contrast.md`):
  no terracotta-500 on text at body size or smaller; permitted on
  display headings, `.btn-primary` fill, NEW tag, decorative rules,
  `.eyebrow ::before` hairline only

## Precommit script

`scripts/phase-b-checks.sh` runs five static checks. Zero matches
required across all five before any commit on a Phase B branch.

| # | Check | Why |
| --- | --- | --- |
| 1 | `@import url(googleapis…)` / `<link…googleapis>` in source files | Strict CSP forbids runtime Google Fonts fetches; next/font self-hosts. |
| 2 | `data-screen-label` attribute outside `_design-reference/` | Canvas annotation; must not leak into production markup. |
| 3 | imports from `_design-reference/` in production code | The folder is a visual reference only; importing pulls hardcoded Georgian, plain `<img>`, and inline event handlers. |
| 4 | inline `onMouseEnter` / `onMouseLeave` handlers | Hover styling must come from CSS `:hover` so it survives SSR + the strict CSP. |
| 5 | PascalCase `*Button.tsx` files | Single Button source-of-truth (D2). |

## Standing protected-surface contract (every slice)

These surfaces never change shape during a Phase B port. A slice
that touches one is a bug.

- **Metadata + JSON-LD** — `generateMetadata` per page, every
  `<JsonLd>` block in `app/[locale]/layout.tsx` and per-page files,
  every schema generator in `lib/schema/`.
- **i18n** — visible strings in `messages/{ka,en}.json`,
  `setRequestLocale` calls, `next-intl` provider wiring, hreflang
  metadata, `[lang]` attribute on `<html>`.
- **CSP** — strict policy with no new origins, nonce threading on
  inline `<script>`, `connect-src` limited to Supabase + analytics +
  Sentry, no remote fonts.
- **Consent** — `<Banner>` cookie consent and the analytics-loader
  gate; analytics scripts mount only after consent.
- **Observability** — `<WebVitalsReporter>`, `<PageViewTracker>`,
  `<AnalyticsLoader>`, `<ServiceWorkerRegister>`, Sentry
  instrumentation files, the `/api/csp-report` and `/api/log-404`
  endpoints, the `/api/vitals` endpoint.
- **Performance** — LCP element on home / category / PDP keeps its
  `priority` flag on `next/image`; CSS bundle does not balloon
  (delta tracked in Slice 8).
- **Server-component default** — pages stay server components; new
  `'use client'` boundaries only where genuinely required (scroll
  listeners, IntersectionObserver, form state).

## Slice 0 — Eyebrow contrast fix

**Branch.** `phase-b/0-eyebrow-contrast`

**Files touched.**

- `components/design/Eyebrow.tsx` — default text colour
  `text-[var(--color-terracotta-500)]` → `text-[var(--color-ink-500)]`.
- `components/home/VisitStrip.tsx:86` — dark-surface override
  `!text-[var(--color-terracotta-500)]` →
  `!text-[var(--color-bone-50)]/55` (~5:1 on ink-900, AA-clear).
- `components/design/design.test.tsx` — extend the existing Eyebrow
  block with assertions: `text-[var(--color-ink-500)]` present, no
  `terracotta-500` substring in the rendered className.

**Out of scope for Slice 0.**

- Hover-state terracotta-500 on inline links (`FeaturedCategories.tsx:187`,
  `FeaturedCollection.tsx:105`, `EyebrowNav.tsx`). These are
  separate components; the inline-link offenders + the latent
  `.text-link:hover` class primitive in `globals.css` consolidate
  into the dedicated **Slice 4 — terracotta-500 contrast sweep**
  (`phase-b/4-terracotta-sweep`); EyebrowNav was deleted entirely
  in Slice 2 alongside IssueRibbon's introduction.
- Adding the `.eyebrow` class hairline rule to the React Eyebrow
  component. The hairline lives in `app/globals.css` (Phase A); it
  arrives in the React component when section ports in Slice 5
  switch to the editorial treatment.
- OG-image eyebrows (`lib/og/templates/base.tsx`) — they paint
  `siteConfig.brand.muted` (#7a6f5e, 4.7:1 on bone), already
  AA-clear; no change.

**Acceptance.**

1. Default Eyebrow renders ink-500 text on bone-50 surfaces (5.59:1).
2. VisitStrip eyebrow renders bone-50/55 on ink-900 (~5:1, AA-clear).
3. Existing snapshot/element-tree tests in `design.test.tsx` continue
   to pass; new assertions enforce the rule going forward.
4. `bash scripts/phase-b-checks.sh` clean.
5. `npm run lint` / `npm test` / `npm run build` clean.

## Slice 4 — terracotta-500 contrast sweep

**Branch.** `phase-b/4-terracotta-sweep`

**Why a separate slice.** Accessibility fixes and visual ports are
different concerns: bundling them muddies the audit trail and makes
git bisect harder. Slice 0 set the precedent for an isolated
~20-line accessibility fix; the three remaining body-size
terracotta-500 paints deserve the same treatment so the contrast
fix lands ahead of the homepage port (formerly Slice 4, now
Slice 5).

**Files touched.**

- `components/home/FeaturedCategories.tsx:187` — link hover/focus
  `text-[var(--color-terracotta-500)]` →
  `text-[var(--color-terracotta-600)]` (5.80:1 on bone-50, AA-clear).
- `components/home/FeaturedCollection.tsx:105` — same substitution.
- `app/globals.css` `.text-link:hover` — `color` and
  `border-bottom-color` from `var(--color-terracotta-500)` →
  `var(--color-ink-900)`. Verified zero production consumers via
  grep before changing; the resting state is already ink-900, so
  the practical effect is "no color shift on hover, gap + arrow
  animations remain." Class kept available for future homepage /
  category consumers.
- `components/home/FeaturedCategories.test.tsx` (new) +
  `components/home/FeaturedCollection.test.tsx` (extended) —
  token-anchored regression guards following the Slice 0 pattern:
  positive `text-[var(--color-terracotta-600)]` substring assertion
  and negative `text-[var(--color-terracotta-500)]` substring
  assertion on each link's resolved className.
- `docs/design/contrast.md` — new "Phase 6 Slice 4 sweep" section
  cataloguing the substitutions made and the remaining intentional
  decorative terracotta-500 occurrences (display em accents, btn
  fills, eyebrow hairline, focus rings) so Slice 8 has a reference
  to verify against.

**Out of scope.**

- The visual port of `FeaturedCategories` and `FeaturedCollection`
  (typography, layout, eyebrows, image treatment) — that work
  belongs to Slice 5 (homepage body).
- Removing the `.text-link` class definition. It stays as a class
  primitive; Slice 5 / 6 may consume it.

**Acceptance.**

1. `grep -rn "hover:text-\[var(--color-terracotta-500)\]"` returns
   zero matches across `app/` and `components/`.
2. `grep -rn "var(--color-terracotta-500)"` in `app/globals.css`
   inside any `:hover` block returns zero matches.
3. Per-link element-tree tests assert the new color token
   (`terracotta-600` for inline-text links, `ink-900` for
   `.text-link:hover`) and explicitly negate `terracotta-500`.
4. Final repo-wide grep documented in `docs/design/contrast.md`
   under Phase 6 Slice 4 — every remaining `terracotta-500` mention
   is either a comment, a token definition, a permitted decorative
   surface, or a permitted display-step accent.
5. `bash scripts/phase-b-checks.sh` clean.
6. `npm run lint` / `npm test` / `npm run build` clean.

## Slices 5–8 — see plan delivered in conversation

Each slice's full per-component plan was delivered in conversation
during the Phase B planning round and is referenced here in
abbreviated form. The detailed acceptance criteria, citations,
and protected-surface concerns expand back from the plan when each
slice opens its own branch.

(Slice plan documents land alongside each PR description so future
agents working from the repo alone have the full context — see
`docs/design/sessions/phase-b-slice-<n>.md` once each opens.)
