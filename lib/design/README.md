# lib/design — design tokens

Single source of truth for visual constants beyond brand identity (which lives in `lib/site-config.ts`'s `brand` block).

These tokens are exported as TypeScript constants AND registered as CSS custom properties under the `@theme` directive in `app/globals.css`. Tailwind v4 generates matching utility classes from the CSS vars (e.g. `bg-surface-0`, `text-ink-80`, `p-22`), and the TS exports are available for runtime decisions (motion config, JSON-LD, anywhere code needs to reason about a token).

## Exports

- **Color scales** — perceptual OKLCH stack: `surfaces` (0–400), `ink` (100/80/60/40/20), `accent` (base/soft/strong/muted), `semantic` (success/warning/error/info), `border` (subtle/default/strong). Phase 5b editorial palette (sRGB hex, supplemental): `bone` (50/100/200), `inkScale` (900/700/500/300), `terracotta` (500/600/100), `brass` (500), `sage` (500). Everything aggregated via `colors`.
- **Spacing** — premium 18 / 22 / 30 / 36 / 44 stops on top of Tailwind's defaults.
- **Font families** — `display`, `body`, plus locale-locked variants (`displayKa`, `displayEn`, `bodyKa`, `bodyEn`). The locale-aware variants (`display`, `body`) flip on the `[lang]` attribute.
- **Typography** — 9-step scale: display-1/2, heading-1/2/3, body-lg/body/body-sm, caption. Each declares `fontSize`, `lineHeight`, `letterSpacing`. Phase 5b revision: oversized confident displays (4.5rem / 3rem at desktop), generous body line-heights (1.7 / 1.75), uppercase captions with 0.08em tracking.
- **Radius** — none/sm/md/lg/xl/2xl/full.
- **Shadow** — soft/medium/large/focus (3px AAA-friendly focus ring).
- **Z-index** — base/dropdown/stickyHeader/banner/overlay/modal/popover/toast (named stacks, no magic numbers).
- **Breakpoint** — mobile/tablet/laptop/desktop/wide (alias of Tailwind defaults).

## Phase 5b editorial palette

The Phase 5b home-page redesign introduces a parallel sRGB-hex palette designed for an editorial "Italian furniture house ⊗ Japanese restraint" feel. Use these tokens in the home redesign components and any new editorial surfaces; the existing perceptual scales (`surfaces`, `ink`, `accent`) remain unchanged for catalogue + admin UIs that already paint with them.

| Token            | Hex       | Where it paints                                                            |
| ---------------- | --------- | -------------------------------------------------------------------------- |
| `bone-50`        | `#faf7f2` | page background (`--background`); warmest off-white                        |
| `bone-100`       | `#f5f0e8` | raised surfaces, cards on hover, subtle section panels                     |
| `bone-200`       | `#ebe3d5` | hairline borders, dividers, image frames                                   |
| `ink-900`        | `#1c1816` | primary text (`--foreground`); deepest                                     |
| `ink-700`        | `#3a342f` | secondary text                                                             |
| `ink-500`        | `#6b6258` | tertiary text (muted body)                                                 |
| `ink-300`        | `#a59c91` | placeholder, decorative metadata                                           |
| `terracotta-500` | `#b85c38` | brand accent: primary CTA bg, eyebrow color, focus ring                    |
| `terracotta-600` | `#9a4a2c` | hover/pressed state of `terracotta-500`                                    |
| `terracotta-100` | `#f4e2d8` | soft tinted backgrounds (badges, faint accent panels)                      |
| `brass-500`      | `#a08555` | small details — links, dividers, footer captions. Never large surfaces.    |
| `sage-500`       | `#6f7a6b` | low-emphasis success states; rare editorial moments                        |

### Usage rules

1. **Background = bone-50, text = ink-900.** Together they read 15.1:1 (AAA). The home, catalogue, admin all share these as `--background` / `--foreground`.
2. **Terracotta is the only accent that paints a large surface.** Buttons, eyebrow captions, and the hero CTA. Brass and sage are reserved for ≤ 24px text and small visual details — use them at scale and they read as institutional gold or hospital green.
3. **Bone-100 vs bone-200.** Bone-100 is the "next layer up" panel surface (e.g. the `<FeaturedCollection>` band; signature-products section background). Bone-200 is the hairline border colour — every editorial card frame, image hairline, divider rule.
4. **Ink-500 for muted body, never ink-300 for paragraphs.** Ink-300 fails AA on bone-50 (2.4:1); reserve it for placeholders and decorative metadata that's redundant with adjacent visible text.
5. **Sharp edges, no border-radius on editorial CTAs.** The new design skips rounded buttons. Cards keep aspect ratios but no rounded corners — borders are 1px hairlines in `bone-200`.

### Pairing with the existing perceptual stack

Existing components reference `var(--color-ink-100)`, `var(--color-surface-300)`, `var(--color-accent-strong)` etc. Those keep working — the OKLCH values they paint are perceptually similar to the new sRGB hex palette. New editorial components reference the new tokens (`var(--color-bone-50)`, `var(--color-ink-900)`, `var(--color-terracotta-500)`) directly. Don't translate one to the other; both are first-class CSS vars.

## Pairing with @theme

`lib/design/tokens.ts` and `app/globals.css` are paired — a value added to the TS module without a matching CSS var (or vice versa) is a bug. The token tests (`tokens.test.ts`) lock the TS shape; visually verify the `@theme` block when adding new tokens.

## Adding a token

1. Add the constant to `tokens.ts` and (if a new category) export from `index.ts`.
2. Mirror it as a CSS variable inside the `@theme` block in `app/globals.css`.
3. Update `tokens.test.ts` so the new key is required.
4. Run `npm test lib/design`.
