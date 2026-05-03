# lib/design — design tokens

Single source of truth for visual constants beyond brand identity (which lives in `lib/site-config.ts`'s `brand` block).

These tokens are exported as TypeScript constants AND registered as CSS custom properties under the `@theme` directive in `app/globals.css`. Tailwind v4 generates matching utility classes from the CSS vars (e.g. `bg-surface-0`, `text-ink-80`, `p-22`), and the TS exports are available for runtime decisions (motion config, JSON-LD, anywhere code needs to reason about a token).

## Exports

- **Color scales** — `surfaces` (0–400), `ink` (100/80/60/40/20), `accent` (base/soft/strong/muted), `semantic` (success/warning/error/info), `border` (subtle/default/strong). Aggregated via `colors`.
- **Spacing** — premium 18 / 22 / 30 / 36 / 44 stops on top of Tailwind's defaults.
- **Font families** — `display`, `body`, plus locale-locked variants (`displayKa`, `displayEn`, `bodyKa`, `bodyEn`). The locale-aware variants (`display`, `body`) flip on the `[lang]` attribute.
- **Typography** — 9-step scale: display-1/2, heading-1/2/3, body-lg/body/body-sm, caption. Each declares `fontSize`, `lineHeight`, `letterSpacing`.
- **Radius** — none/sm/md/lg/xl/2xl/full.
- **Shadow** — soft/medium/large/focus (3px AAA-friendly focus ring).
- **Z-index** — base/dropdown/stickyHeader/banner/overlay/modal/popover/toast (named stacks, no magic numbers).
- **Breakpoint** — mobile/tablet/laptop/desktop/wide (alias of Tailwind defaults).

## Pairing with @theme

`lib/design/tokens.ts` and `app/globals.css` are paired — a value added to the TS module without a matching CSS var (or vice versa) is a bug. The token tests (`tokens.test.ts`) lock the TS shape; visually verify the `@theme` block when adding new tokens.

## Adding a token

1. Add the constant to `tokens.ts` and (if a new category) export from `index.ts`.
2. Mirror it as a CSS variable inside the `@theme` block in `app/globals.css`.
3. Update `tokens.test.ts` so the new key is required.
4. Run `npm test lib/design`.
