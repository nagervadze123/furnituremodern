# Typography — Phase 6 Editorial System

The editorial design system pairs four families: **Fraunces** (display
serif), **Inter** (body sans), **Noto Serif Georgian** (display serif
fallback for Mkhedruli script), and **Noto Sans Georgian** (body sans
fallback for Mkhedruli). Phase A confirms the loading mechanism, the
per-character fallthrough behaviour, and the optical-sizing axis
values used at each display step.

## Loading mechanism

All four families are loaded by `next/font/google` in
[`app/layout.tsx`](../../app/layout.tsx) (lines 52–78). `next/font`
does **not** request fonts from `fonts.googleapis.com` at runtime — it
downloads the subsets at build time, fingerprints them, and serves
them from the project origin alongside other static assets. That is
what keeps the site compatible with the strict CSP (which has no
external font origins in `connect-src` / `font-src`).

Each family is loaded with a `--variable` and the requested weights:

| Family | CSS variable | Subsets | Weights | `display` |
| --- | --- | --- | --- | --- |
| Fraunces | `--font-display` | `latin`, `latin-ext` | 400 / 500 / 600 / 700 | `swap` |
| Inter | `--font-body` | `latin`, `latin-ext` | 400 / 500 / 600 / 700 | `swap` |
| Noto Serif Georgian | `--font-georgian-serif` | `georgian` | 400 / 500 / 600 / 700 | `swap` |
| Noto Sans Georgian | `--font-georgian-sans` | `georgian` | 400 / 500 / 600 / 700 | `swap` |

The four `.variable` class names are concatenated onto `<html>` in
`app/layout.tsx:166`, so every page in the tree resolves all four CSS
variables.

The OG-image generator (`lib/og/fonts.ts`) reads the same families
from `@fontsource/*` packages so server-rendered social card images
ship with the same letterforms — there is **no** path through which
the runtime app or build artifacts reach a Google Fonts URL.

## Per-character fallthrough — the Mkhedruli problem

Fraunces and Inter ship Latin and Latin Extended glyphs but **no
Mkhedruli** (Georgian script). A line like
`ხის ავეჯი — Wood furniture` is mixed-script, and we want both halves
to render in the right family without splitting the markup or doing
per-locale CSS.

The pattern is a multi-family `font-family` chain that lists the
Latin family first, then the Georgian family, then a system fallback:

```css
font-family:
  var(--font-display),         /* Fraunces — Latin, Latin Ext */
  var(--font-georgian-serif),  /* Noto Serif Georgian — Mkhedruli */
  Georgia, "Times New Roman", serif;
```

CSS font-fallback resolution is **per-character**: when the renderer
encounters `ხ` (a Mkhedruli letter), it asks Fraunces for a glyph,
gets nothing, and walks the next family in the chain — Noto Serif
Georgian — which does have it. Latin letters in the same string keep
the Fraunces glyph because Fraunces succeeds the lookup for those.
No `[lang="ka"]` switch is required for the common case of mixed
copy.

`globals.css:55–59` already declares the same chain in `@theme inline`
for `--font-sans` / `--font-display` / `--font-heading`; the editorial
class primitives in `globals.css` follow the identical pattern so that
display headlines, ledes, eyebrows and buttons all get the right
glyph for every character.

The locale-aware variables `--font-display-locale` / `--font-body-locale`
(`globals.css:240–249`) exist for the rare case where a single
component needs the locale's own family unconditionally — the body
text mostly does **not** use these because per-character fallthrough
is preferred.

## Fraunces optical sizing (`opsz` axis)

Fraunces is a variable font with an `opsz` axis ranging from 9 to 144.
Larger values produce more dramatic terminals, sharper contrast, and
the display-poster look the editorial system uses for hero headlines;
smaller values flatten the contrast so the same family stays legible
at sub-headline sizes.

The editorial system pins four presets, applied through
`font-variation-settings: "opsz" <value>`:

| Class | `opsz` | Approx. rendered size | Role |
| --- | ---: | --- | --- |
| `.display-1` | **144** | clamp(3rem, 6.2vw, 5.25rem) | Hero headline |
| `.display-2` | **100** | clamp(2.5rem, 4.6vw, 4rem) | Section H2 |
| `.display-3` | **60** | clamp(2rem, 3.2vw, 2.75rem) | Category / product name |
| `.lede` | **24** | clamp(1.25rem, 1.4vw, 1.5rem) | Italic sub-headline |

Two of the four (144 and 24) are exposed as named CSS variables —
`--fraunces-opsz-display` and `--fraunces-opsz-body` — because they
recur across multiple class primitives. `.display-2` and `.display-3`
inline their literal axis values (100 and 60) since each is used in
exactly one class.

The Hero in `_design-reference/components/page-homepage.jsx:46` sets
its own larger `font-size: clamp(3.5rem, 7vw, 6.5rem)` and explicit
`fontVariationSettings: "'opsz' 144"` — the Phase B port of the Hero
component will lift these over to the existing
`components/home/Hero.tsx` while keeping the multi-script font chain
described above.

### Noto Serif Georgian and the `opsz` axis

Noto Serif Georgian is a non-variable, multi-weight family. It does
**not** have an `opsz` axis, so applying
`font-variation-settings: "opsz" 144` to a Georgian glyph is a no-op —
the renderer just picks the matching weight (400 / 500 / 600 / 700)
that was loaded. That is the correct behaviour. The axis value lives
on the element; the Latin run renders with optical sizing, the
Mkhedruli run renders at its native weight, and both share the same
visual scale because the type-size and line-height are set on the
class — not the axis.

## Quick reference — per-component default

| Element | Family | Variant / opsz |
| --- | --- | --- |
| H1 hero headline | Fraunces / Noto Serif Georgian | `.display-1`, `opsz` 144 |
| H2 section headline | Fraunces / Noto Serif Georgian | `.display-2`, `opsz` 100 |
| Category / product name | Fraunces / Noto Serif Georgian | `.display-3`, `opsz` 60 |
| Italic sub-headline | Fraunces / Noto Serif Georgian | `.lede`, `opsz` 24 |
| Body copy | Inter / Noto Sans Georgian | Tailwind `font-sans` |
| Eyebrow / kicker | Inter / Noto Sans Georgian | `.eyebrow`, 0.75 rem, 0.18 em tracking |
| Buttons | Inter / Noto Sans Georgian | `.btn`, 0.875 rem, 0.04 em tracking |
| Links (editorial) | Inter / Noto Sans Georgian | `.text-link`, 1 em |

## Sources

- `_design-reference/styles/system.css` lines 33–48 — token declarations.
- `_design-reference/styles/system.css` line 106 — `.display-1` opsz 144.
- `_design-reference/styles/system.css` line 117 — `.display-2` opsz 100.
- `_design-reference/styles/system.css` line 128 — `.display-3` opsz 60.
- `_design-reference/styles/system.css` line 143 — `.lede` opsz 24.
- `app/layout.tsx` lines 52–78 — runtime font loading.
- `app/layout.tsx` line 166 — `--variable` className wiring.
- `app/globals.css` lines 55–59, 240–249 — Theme-level font chain + locale variables.
- `app/globals.css` Phase 6 editorial primitives block — `.display-*`, `.lede`, `.eyebrow`, `.btn`, `.text-link` definitions.
- `lib/og/fonts.ts` — `@fontsource/*` paths used for OG image generation.
