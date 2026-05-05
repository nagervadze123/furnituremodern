# `_design-reference/` — claude.ai/design export

This folder is the unmodified export from claude.ai/design used as the
visual reference for the Phase 6 editorial redesign. It does **not**
ship — the leading underscore mirrors a private/non-routable convention,
and Next.js will not treat anything inside as a route.

## Contents

- `styles/system.css` — design tokens + class-based primitives the
  editorial layout uses. The Tailwind `@theme` block in
  `app/globals.css` already mirrors the palette (Phase 5b); Phase A
  ports only the deltas (hairline tokens, container/gutter/motion
  tokens, the class primitives).
- `components/page-*.jsx` — visual mocks for homepage / category /
  product / privacy plus a mobile homepage variant. Plain React/JSX,
  no i18n, no Server Components, no `next/image`. **Do not import
  these into the app**; they are read-only references.
- `components/site-chrome.jsx` — header + footer mocks.
- `Home.html`, `Site*.html`, `design-canvas.jsx`, `tweaks-panel.jsx`
  — the design tool's own preview canvas. Ignore for porting.

## Citations

Every token Phase A copies into `app/globals.css` is cited in
`docs/design/sessions/phase-a.md` by `<file>:<line>`, e.g.
`system.css:22`. Keeping this folder in version control is what makes
those citations stable.
