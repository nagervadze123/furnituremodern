# Contrast — Phase 6 Editorial Palette

WCAG 2.1 contrast ratios for the foreground/background pairs the
editorial palette uses most often. Ratios were computed from sRGB hex
values using the standard relative-luminance formula.

## Method

```
relLum(hex) = 0.2126·R' + 0.7152·G' + 0.0722·B'
ratio(a, b) = (max(L_a, L_b) + 0.05) / (min(L_a, L_b) + 0.05)
```

…where each channel is gamma-decoded with
`c' = c/12.92` if `c ≤ 0.03928`, else `c' = ((c + 0.055)/1.055)^2.4`.

Thresholds:

- **AA** (body text, ≥4.5:1)
- **AA Large** (≥18.66 px bold or ≥24 px regular, ≥3:1)
- **AAA** (body text, ≥7:1)

## Results

| Foreground | Background | Ratio | AA | AA Large | AAA |
| --- | --- | ---: | :---: | :---: | :---: |
| `terracotta-500` `#b85c38` | `bone-50` `#faf7f2` | **4.25** | ❌ FAIL | ✅ pass | ❌ FAIL |
| `terracotta-500` `#b85c38` | `ink-900` `#1c1816` | **3.88** | ❌ FAIL | ✅ pass | ❌ FAIL |
| `ink-900` `#1c1816` | `bone-50` `#faf7f2` | **16.49** | ✅ pass | ✅ pass | ✅ pass |
| `bone-50` `#faf7f2` | `ink-900` `#1c1816` | **16.49** | ✅ pass | ✅ pass | ✅ pass |
| `ink-700` `#3a342f` | `bone-50` `#faf7f2` | **11.48** | ✅ pass | ✅ pass | ✅ pass |
| `ink-500` `#6b6258` | `bone-50` `#faf7f2` | **5.59** | ✅ pass | ✅ pass | ❌ FAIL |
| _bonus:_ `terracotta-600` `#9a4a2c` | `bone-50` `#faf7f2` | **5.80** | ✅ pass | ✅ pass | ❌ FAIL |

## Findings

### terracotta-500 fails AA at body sizes

`terracotta-500` (#b85c38) sits at 4.25:1 on bone-50 and 3.88:1 on
ink-900 — both **below the 4.5:1 AA floor for body text**. It clears
AA Large (≥18.66 px bold / ≥24 px regular) and is fine for purely
decorative roles.

**Where this is safe to use:**

- Display headlines (`.display-1`, `.display-2`, `.display-3` — all
  comfortably exceed 24 px).
- The italic `<em>` accent inside displays — same size class as the
  surrounding heading.
- Filled buttons (`.btn-primary` paints bone-50 _on_ terracotta-500
  at 0.875 rem / 14 px; the WCAG 2.1 SC 1.4.3 carve-out for
  user-interface components reads as a 3:1 floor — this clears that
  but anything smaller would not).
- Decorative dots, the `.eyebrow` ::before hairline rule, and the
  small terracotta-500 on ink-900 dot in the hero eyebrow (all
  decoration, not informational text).
- Hover-state link colour on `.text-link` — fleeting, paired with an
  underline that stays at full ink-900 contrast in the rest state.

**Where it must NOT be used:**

- Body copy (≤16 px non-bold) on bone-50 or ink-900.
- Eyebrow labels at 0.75 rem / 12 px.
- Caption-sized metadata.
- Inline links inside paragraphs.

For accent text at body or smaller sizes use `terracotta-600`
(#9a4a2c) instead — 5.80:1 on bone-50, clears AA. The Phase 5b
palette already includes both swatches; the convention going into
Phase B is **terracotta-500 = display + filled-button accent,
terracotta-600 = inline-text + hover accent**.

### ink-500 passes AA but not AAA

`ink-500` (#6b6258) on bone-50 lands at 5.59:1 — fine for caption
and eyebrow roles (where it is currently used), but a paragraph of
body copy in ink-500 would not clear AAA. Keep body copy at ink-700
(11.48:1, clears AAA) or ink-900 (16.49:1, clears AAA).

### Pairs that pass everything

`ink-900` ↔ `bone-50` (the dominant page text/background pair) and
`ink-700` on `bone-50` (used for `.lede` sub-headlines) clear AA, AA
Large, and AAA in both directions. No constraints on size, weight, or
placement.

## Phase B — terracotta-500 use rule (canonical)

This is the rule every Phase B component decision must follow.
It exists because `terracotta-500` measured 4.25:1 on bone-50 — a
real WCAG AA failure for text at body size or smaller, present in
production today via `components/design/Eyebrow.tsx`.

### Permitted uses of terracotta-500

- Italic accent runs inside display-step text (`.display-1` /
  `.display-2` / `.display-3` `<em>` — covered by AA Large at 3:1).
- `.btn-primary` background fill — the text on top is `bone-50`
  (`#faf7f2`), so the foreground/background pair is bone-on-terracotta
  at the same 4.25:1 ratio, which the WCAG 1.4.11 carve-out for
  user-interface components reads at 3:1.
- Decorative rules and the **NEW** product-card tag — non-text
  graphical elements, 3:1 floor under SC 1.4.11.
- The 1 px hairline drawn before `.eyebrow` text via `::before` —
  decoration, not text.

### Forbidden uses of terracotta-500

- Any text rendered at body size (≤16 px) or smaller. This includes
  eyebrow labels (12 px), captions, table cell content, breadcrumb
  segments, footer links, pagination, sort-bar links.
- Inline links inside paragraphs (always smaller than display).
- Muted accents on caption/secondary text.
- The `<a>` colour inside `_design-reference/components/site-chrome.jsx:217`
  cookie-banner privacy link — must port as `ink-700` with an
  `ink-700` (or `terracotta-600`) underline, not `terracotta-500`.

### Canonical substitutions for body-size accent text

- **Eyebrow text** → `ink-500` (`#6b6258`, 5.59:1, AA-clear).
  The 1 px terracotta-500 hairline before the eyebrow stays — that
  is where the brand accent lives at body size.
- **Inline-text accent** (links, hover states, body-size emphasis)
  → `terracotta-600` (`#9a4a2c`, 5.80:1, AA-clear).
- **Body copy** → `ink-700` (`#3a342f`, 11.48:1, AAA-clear) or
  `ink-900` (`#1c1816`, 16.49:1, AAA-clear).
- **Caption / secondary metadata** → `ink-500` (`#6b6258`, 5.59:1,
  AA-clear).

### Where this rule applies in Phase B

Every slice in `docs/design/sessions/phase-b.md` must verify, before
merging, that it has not introduced a terracotta-500 paint on text
at body size or smaller. Slice 0 (the eyebrow contrast fix) is the
first place this is enforced; subsequent slices inherit the rule.

## Sources

- WCAG 2.1 Understanding SC 1.4.3 (Contrast Minimum):
  <https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html>
- WCAG 2.1 Understanding SC 1.4.6 (Contrast Enhanced):
  <https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html>
- Hex values from `_design-reference/styles/system.css` lines 12–24
  (mirrors `app/globals.css` Phase 5b palette).
