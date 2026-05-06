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
- [ ] `bash scripts/phase-b-checks.sh` clean (all 6 checks pass)
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

`scripts/phase-b-checks.sh` runs six static checks. All must pass
before any commit on a Phase B branch.

| # | Check | Why |
| --- | --- | --- |
| 1 | `@import url(googleapis…)` / `<link…googleapis>` in source files | Strict CSP forbids runtime Google Fonts fetches; next/font self-hosts. |
| 2 | `data-screen-label` attribute outside `_design-reference/` | Canvas annotation; must not leak into production markup. |
| 3 | imports from `_design-reference/` in production code | The folder is a visual reference only; importing pulls hardcoded Georgian, plain `<img>`, and inline event handlers. |
| 4 | inline `onMouseEnter` / `onMouseLeave` handlers | Hover styling must come from CSS `:hover` so it survives SSR + the strict CSP. |
| 5 | PascalCase `*Button.tsx` files | Single Button source-of-truth (D2). |
| 6 | `var(--color-terracotta-500)` paint count exceeds baseline | Slice 4 sweep documented exactly 10 permitted production paints (filled-button surfaces, decorative focus rings, display em accent, eyebrow ::before hairline) in `docs/design/contrast.md`. New growth fails CI so the diff surfaces in code review and either gets fixed or consciously bumped against the inventory in the same PR. Baseline lives in the script as `TC500_BASELINE`; bump it deliberately when the inventory legitimately changes. |

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

## Slice 5 — Homepage body (port + EditorialHeading + AspectFrame)

**Branch.** `phase-b/5-homepage-body`

**New primitives (D1 — primitives ship with first consumer).**

- `components/design/EditorialHeading.tsx` — variant: `'hero' | 1 | 2 | 3`, defaults to `<h1>` (hero / 1), `<h2>` (2), `<h3>` (3); override via `as`. Variant maps onto the `.display-hero` / `.display-1` / `.display-2` / `.display-3` CSS class primitives in `app/globals.css`. No `sizeOverride` escape hatch (per D4) — new sizes get new variant values.
- `components/design/AspectFrame.tsx` — aspect-locked editorial frame with the bone-200 hairline border + bone-100 inner background. Children compose freely (`<Image fill>`, overlays, captions). Ratios: `'1/1' | '4/5' | '4/3' | '3/2' | '16/9'`.
- `app/globals.css` — new `.display-hero` rule (font-size `clamp(3.5rem, 7vw, 6.5rem)`, opsz 144) so the hero can step a notch above `.display-1` without an inline style override.

**Consumers ported.**

- `components/home/Hero.tsx` — LCP element. `next/image` retains the `priority` flag; the editorial port swaps the heading to `<EditorialHeading variant="hero">`, picks up the dark-surface eyebrow + lede pattern from `_design-reference/components/page-homepage.jsx:38-87`, and pairs the primary CTA (existing terracotta-500 fill, AA Large) with a ghost CTA (Slice 2 `editorialGhost` button variant).
- `components/home/FeaturedCategories.tsx` — three editorial rows. `EditorialHeading variant={2}` for each row name; AspectFrame for each image well; `CATEGORY_CTA_LINK_CLASS` constant introduced in Slice 4 stays the link contract.
- `components/home/FeaturedCollection.tsx` — featured product spread. EditorialHeading variant 2 for the headline, AspectFrame at 3/2.
- `components/home/SignatureProducts.tsx` — recent-pieces grid. Per-card AspectFrame at 4/5; product names in serif via Display chain (kept; Display still resolves correctly until Slice 8 deprecation).
- `components/home/BrandStory.tsx` — workshop / story section. EditorialHeading 2; lede paragraph + body copy; no image change required.
- `components/home/VisitStrip.tsx` — dark-surface visit panel. EditorialHeading 2 painted bone-50; brass-500 link accent per the Slice 3 footer pattern; eyebrow already locked to bone-50/55 in Slice 0.

**Acceptance.**

1. EditorialHeading is the only rendering path for editorial display-step text on the homepage. The legacy `Display` primitive remains in the barrel (Category and PDP slices migrate it later) but does not appear in any homepage component.
2. AspectFrame ships with at least three first-consumer call sites (FeaturedCategories, FeaturedCollection, SignatureProducts at minimum).
3. Hero `next/image` keeps `priority`; CLS on `/ka` and `/en` ≤ 0.05; Lighthouse Performance delta ≤ ±2 points vs the pre-slice production deployment (manual audit, recorded in PR description).
4. `WebPage`, `LocalBusiness`, and `FAQPage` JSON-LD shapes are byte-identical pre- and post-slice (no `lib/schema/` files touched).
5. New strings flow through `next-intl`; both `messages/ka.json` and `messages/en.json` updated in the same commit.
6. No `[data-reveal]` selector appears anywhere in production code — the on-brand pattern is `<Reveal>` / `<RevealStagger>` from `lib/motion`. The `data-reveal` hook stays in `_design-reference/`.
7. `bash scripts/phase-b-checks.sh` clean. Precommit invariant 6 (terracotta-500 paint baseline = 10) gates net-new offenders; the slice stays at or below baseline.
8. `npm run lint` / `npm test` / `npm run build` clean.

**Out of scope.**

- The Category and PDP body ports (Slices 6 and 7).
- Removing the `Display` primitive. Display has a Category consumer (`components/category/CategoryHero.tsx`); it deprecates in Slice 8 once every consumer has migrated.
- Image asset swaps. The slice ports the layout / typography contract; the actual hero / category / story photos stay on whatever the data layer + `scripts/stock-photos-prepared/` already provide. Asset selection is a content decision tracked separately.

## Slice 6 — Category body (port + Tag primitive)

**Branch.** `phase-b/6-category-body`

**New primitives (D1 — primitives ship with first consumer).**

- `components/design/Tag.tsx` — small editorial badge with two
  variants. `'new'` paints `bone-50` on `var(--color-terracotta-500)`
  (filled-button surface, SC 1.4.11 carve-out at 4.25:1) and
  appears only on products whose `createdAt` is within the last
  30 days. `'neutral'` paints `ink-700` on `bone-100` (no
  terracotta touch). The 30-day predicate lives as a small
  helper next to the primitive so the contract — what counts
  as "new" — is unambiguous.
- The `Tag` primitive lands `editorial` styling, not `shadcn` UI
  styling. That keeps `components/ui/badge.tsx` (the shadcn
  primitive) untouched and preserves the D2 single-Button rule
  for buttons; Tag is a separate visual concern.

**Consumers ported.**

- `components/category/CategoryHero.tsx` — when an `imageUrl` is
  present, the lead photo moves from a 4/5 rounded portrait to a
  21/9 framed landscape via `AspectFrame` (second consumer of the
  primitive after Slice 5 — validates the API across two surfaces).
  Heading: `EditorialHeading variant={1} as="h1"` (the page's only
  H1 stays at display-1 scale). Eyebrow: `Eyebrow` primitive,
  ink-500.
- `components/sections/product-card.tsx` — image well moves from a
  rounded `bg-muted` div to `AspectFrame ratio="4/5"`; the
  `is_new` Tag floats top-left in absolute position; product
  name moves to `font-display` ink-900 with break-words; price
  reads tabular-nums ink-500. Hover treatment unchanged
  (motion-safe scale 1.03).
- `components/category/ProductGrid.tsx` — small typography touch
  on the empty-state copy + the "browse other categories" link;
  grid layout untouched.
- `components/category/SortBar.tsx` — refactor from native
  `<select>` to a row of inline links. Active key paints
  `text-[var(--color-ink-900)]` with a 1 px ink-900 underline;
  inactive keys paint `text-[var(--color-ink-700)]`. No
  terracotta on text. Form fallback is preserved by emitting
  real `<a href="?sort=…">` anchors so no-JS visitors still
  navigate; the client island intercepts the click and uses
  `router.replace` with `useTransition` for the smooth path.

**Out of scope.**

- The product detail page port (Slice 7).
- Pagination — there is no public pagination UI on the category
  page today (the admin index has its own paginator; that one is
  not affected by Phase B). The user's "pagination logic
  untouched" reminder is academic for this slice.
- Schema layer (`lib/schema.ts`, `components/json-ld.tsx`).
  Those modules are not touched, which is the byte-identity
  guarantee for `BreadcrumbList`, `CollectionPage`, and `ItemList`
  JSON-LD. The existing `lib/schema.test.ts` already locks the
  generator outputs.

**Acceptance.**

1. CategoryHero with image renders `AspectFrame ratio="21/9"`;
   without image renders the centred minimalist column.
2. The H1 paints via `EditorialHeading variant={1} as="h1"`;
   `Display` import removed from this file.
3. Product cards render `Tag variant="new"` only for products
   whose `createdAt` is within the last 30 days. Products with
   no `createdAt` (offline TS catalogue) get no tag.
4. SortBar renders three inline `<a>` links (newest / price asc /
   price desc) with the editorial active/inactive paint pattern;
   client-side click handler keeps shallow `router.replace`
   navigation; native nav remains the no-JS fallback.
5. `WebPage`, `LocalBusiness`, `FAQPage`, `BreadcrumbList`,
   `CollectionPage`, `ItemList` JSON-LD shapes byte-identical
   pre- and post-slice. (Verified by not touching `lib/schema.ts`
   or the call sites at `components/sections/category-page.tsx:105-132`.)
6. `bash scripts/phase-b-checks.sh` clean. The Tag `'new'`
   variant introduces a new `var(--color-terracotta-500)` paint
   for the badge background fill — the precommit baseline either
   holds at 11 (if the implementation reuses an existing paint
   site) or bumps to 12 with the rationale documented in
   `contrast.md` "Filled-button surfaces" subsection. Surface
   the bump in the PR description if it moves.
7. `npm run lint` / `npm test` / `npm run build` clean.

## Slices 5–8 — scope captured in this document

Each remaining slice's scope, files-touched list, out-of-scope
items, and acceptance criteria land directly as a section in **this
document** when the branch opens. Earlier slices (`phase-b-slice-2.md`,
`phase-b-slice-4.md`) used a separate per-slice scope file; that
pattern stops here. A single `phase-b.md` keeps the audit trail in
one place and removes the awkward "where is this slice's scope?"
lookup. The PR description carries the slice's summary; the section
in this document carries the contract.

## Post-Phase-B artifact retention (placeholder — decide after Slice 8)

When Slice 8 lands and the editorial port is closed, evaluate every
process artifact this phase introduced for retention vs archival.
Not a decision for now — just a placeholder so it doesn't get
forgotten when the port is done. Items to revisit:

- **The 6 precommit checks in `scripts/phase-b-checks.sh`.** Which
  encode long-term invariants (no `googleapis` fetches under strict
  CSP; single Button source-of-truth; no inline mouse handlers;
  the terracotta-500 paint baseline) vs which were port-specific
  scaffolding (`data-screen-label` / `_design-reference/` import
  guards stop being meaningful once the reference folder is
  deleted in Slice 8)?
- **`docs/design/contrast.md`** — long-term living document.
  Keeps growing as the palette evolves.
- **`docs/design/sessions/phase-b.md`** — the decision log.
  Archive (or move into `docs/design/sessions/_archive/`) once
  Phase B closes; future phases get their own session document.
- **Per-slice scope docs** (`phase-b-slice-2.md`, `phase-b-slice-4.md`)
  — archive alongside `phase-b.md`.
- **Exported design-contract constants** like
  `CATEGORY_CTA_LINK_CLASS` — long-term, but reconsider if they
  proliferate beyond ~3-4 instances. At that point a single
  `lib/design/contracts.ts` module is more maintainable than a
  scattered set of named exports across component files.
