# Phase B Slice 2 — Header + IssueRibbon

Scope captured before the branch opens. Ratifies the D1 redistribution
(EditorialButton variants + SectionMarker land here, not in a
separate primitives PR) and the user-stated specifics from the
review of Slice 1.

## Branch

`phase-b/2-header-issue-ribbon`

## Files touched

### Net-new

- `components/home/IssueRibbon.tsx` — masthead "In this issue" strip.
  Server component. Five numerated section labels + an issue number,
  all routed through `next-intl`. Replaces `EyebrowNav` on the home
  page composition. Visual reference:
  `_design-reference/components/page-homepage.jsx:95-138`.
- `components/home/IssueRibbon.test.tsx` — element-tree tests.
- `components/design/SectionMarker.tsx` — small composable primitive
  used by `IssueRibbon` (and future home/category sections in Slices 4+).
  Numeral + label, eyebrow typography. Visual reference:
  `_design-reference/components/page-homepage.jsx:108-114, 145, 208, 245, 276`.
- `components/design/SectionMarker.test.tsx` — element-tree tests.

### Modified

- `components/ui/button.tsx` — extend the existing CVA `buttonVariants`
  with editorial variants (`editorial`, `editorialPrimary`,
  `editorialGhost`). Add a comment block at the top declaring this
  file as the single source of truth for all button styling, per
  D2. The shadcn Button already supports `asChild` via `@radix-ui/react-slot`;
  we keep that surface untouched.
- `components/layout/header.tsx` — editorial typography on nav links
  (12 px / 0.18 em / uppercase / 500), dot separators between links,
  Visit CTA wired to the new `editorialGhost` button variant, transparent
  hero state inverted to bone-50 text. Stays a server component;
  scroll behaviour stays in the client `HeaderScrollEffect` boundary.
- `components/layout/HeaderScrollEffect.tsx` — **extend, do not replace.**
  Existing scroll listener stays as-is; we add the
  transparent-on-hero / blur-on-scroll background swap by wiring the
  effect's emitted state through to the header's CSS classes.
- `components/layout/desktop-nav.tsx` — typography + dot separator
  styling.
- `components/layout/LanguageSwitcher.tsx` — restyle to match
  editorial typography (KA / divider / EN). Component shape unchanged.
- `components/layout/BrandMark.tsx` — adjust if needed for the
  inverted-on-hero state.
- `components/layout/header.test.tsx` — update for new structure.
- `components/layout/desktop-nav.test.tsx` — update.
- `components/layout/LanguageSwitcher.test.tsx` — update.
- `components/layout/NavLink.test.tsx` — update.
- `app/[locale]/page.tsx` — replace `<EyebrowNav />` with
  `<IssueRibbon />`. The metadata, JSON-LD, AEO, FAQ, and data
  fetching all stay exactly as-is (composition-only edit).
- `messages/ka.json`, `messages/en.json` — migrate
  `home.eyebrow_nav.*` keys to `home.issue_ribbon.*` and add the
  IssueRibbon-specific keys (`in_this_issue`, the five section
  labels, the `issue` number, masthead-format helpers).
- `components/home/BrandStory.tsx`,
  `components/home/FeaturedCategories.tsx`,
  `components/home/VisitStrip.tsx` — update doc-references to
  "IssueRibbon" (comment-only changes).

### Deleted (per D3)

- `components/home/EyebrowNav.tsx`
- `components/home/EyebrowNav.test.tsx`

## Standing protected-surface contract — verification points

- **JSON-LD** — Organization / WebSite (root layout) and home-page
  WebPage / LocalBusiness / FAQPage all stay attached. The slice
  doesn't touch any `<JsonLd>` block. Reviewer can grep `<JsonLd`
  diff against `app/[locale]/layout.tsx` and `app/[locale]/page.tsx`
  — should show zero schema-block changes.
- **i18n** — every visible string flows through `next-intl`. Both
  `ka.json` and `en.json` updated in the same commit. Hreflang +
  `[lang]` attribute stay (root + locale layouts unchanged).
- **CSP** — no remote font/CDN imports, no inline event handlers.
  Header transition uses CSS via the existing `HeaderScrollEffect`
  client boundary; `desktop-nav.tsx` stays a server component.
- **Cookie consent** — `<Banner>` and the analytics-loader gate in
  the locale layout aren't touched. Analytics scripts still mount
  only after consent.
- **Observability** — `<WebVitalsReporter>`, `<PageViewTracker>`,
  `<AnalyticsLoader>`, `<ServiceWorkerRegister>`, Sentry config,
  `/api/csp-report`, `/api/log-404`, `/api/vitals` all unchanged.
- **Performance** — header swap is CSS-driven; no new client-side
  JS; LCP element on `/ka` and `/en` (the hero image, when ported
  in Slice 4) keeps its `priority` flag. CSS bundle delta tracked.

## Specific requirements (user-stated)

- **HeaderScrollEffect.tsx** — extend, don't replace. The existing
  passive scroll listener and IntersectionObserver-or-equivalent
  stays. Header's editorial behaviour rides on top of the same
  effect's emitted state.
- **IssueRibbon issue number "№06 · 2026"** — i18n-keyed, no
  `siteConfig` field per D5. Both `messages/ka.json` and
  `messages/en.json` add the `home.issue_ribbon.issue` key in the
  same commit.
- **Visit CTA** — uses the existing shadcn Button at
  `components/ui/button.tsx` with the new `editorialGhost` variant.
  No `EditorialButton.tsx` file is added. Per D2, the precommit
  invariant `git ls-files '**/[A-Z]*Button.tsx'` stays empty.

## Acceptance

1. `npm run lint` clean
2. `npm test` clean — existing 567 + new IssueRibbon + SectionMarker
   tests + button-variant assertions
3. `npm run build` clean (only the expected Sentry-auth-token warning)
4. `bash scripts/phase-b-checks.sh` clean (all 5 invariants)
5. No new visual-variant `*Button.tsx` file
6. No production import from `_design-reference/`
7. terracotta-500 paint check — manual grep on changed files; per
   the rule, terracotta only on `.btn-primary` fill (no use-cases in
   this slice — the Visit CTA is `editorialGhost`, not primary), the
   `.eyebrow ::before` hairline (lives in globals.css, not painted
   directly), and decorative rules (none in this slice)
8. JSON-LD shapes unchanged (snapshot grep against pre-slice
   markup of `<JsonLd>` blocks)
9. EyebrowNav cleanly deleted; no dangling imports anywhere in the
   tree (precommit covers the import grep)
10. The Visit CTA renders via the shadcn Button (editorialGhost
    variant). Asserted in a button-variant test.

## Diff-size sanity check (calibrated for Slice 2, not the original sketch)

Materially bigger than Slices 0 and 1 — that is expected, and that
is why D1 puts primitives with first consumers rather than in a
separate library PR. The accumulated diff covers two new components
(IssueRibbon, SectionMarker), an extension of one existing CVA
(`buttonVariants`), edits to ~5 layout files, two i18n message
files, the home-page composition, and the deletion of EyebrowNav.

If the diff materially exceeds that scope (e.g., touches a JSON-LD
emitter, modifies any file in `lib/`, or adds a new component file
not in the list above), I stop and surface before pushing.

## Out of scope (deferred)

- Hero typography port — Slice 4.
- FeaturedCategories / FeaturedCollection / SignatureProducts /
  BrandStory / VisitStrip section-body ports — Slice 4.
- `EditorialHeading` + `AspectFrame` primitives — Slice 4 (their
  first consumers live there).
- Tag primitive — Slice 5.
- Hover-state terracotta-500 fixes on `FeaturedCategories.tsx:187`
  and `FeaturedCollection.tsx:101` — Slice 4 (those components port
  there). The fix is fast but pulling it forward into Slice 2
  bloats the diff for no review benefit.
- `_design-reference/` deletion + `.gitignore` entry — Slice 7.
