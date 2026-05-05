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

## Phase B follow-up

When porting individual components, add Tailwind class assertions
(or a small lint rule) so any future use of
`text-[var(--color-terracotta-500)]` paired with a sub-display font
size triggers a review. The current React `Eyebrow` primitive
(`components/design/Eyebrow.tsx`) already paints terracotta-500 at
0.75 rem / 12 px — that is **below AA** and should be revisited
during the Phase B eyebrow port (likely swapping the colour to
ink-500 with terracotta-500 reserved for the leading hairline rule).

## Sources

- WCAG 2.1 Understanding SC 1.4.3 (Contrast Minimum):
  <https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html>
- WCAG 2.1 Understanding SC 1.4.6 (Contrast Enhanced):
  <https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html>
- Hex values from `_design-reference/styles/system.css` lines 12–24
  (mirrors `app/globals.css` Phase 5b palette).
