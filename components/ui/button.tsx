// SINGLE SOURCE OF TRUTH for ALL button styling in this app —
// shadcn admin variants AND Phase 6 editorial variants live in the
// same `buttonVariants` CVA below. Adding a new visual variant means
// adding a `variants.variant` entry here, NOT creating a new
// component file. There is intentionally no `EditorialButton.tsx`.
//
// The Phase B precommit invariant
// `git ls-files '**/[A-Z]*Button.tsx'` enforces this — adding any
// PascalCase Button file would break CI. Domain action wrappers
// (e.g., `delete-product-button.tsx`) are kebab-case and exempt.
//
// DO NOT regenerate this file via `npx shadcn add button` — the CLI
// would clobber the editorial variants. If a future shadcn upgrade
// is needed, hand-merge the upstream change with the editorial
// variants intact.

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // ---------------------------------------------------------
        // Phase 6 editorial variants — paired with the editorial
        // size below. Sharp corners (rounded-none), 1 px borders,
        // CSS-only hover transitions. Visual contracts mirror the
        // `.btn`, `.btn-primary`, and `.btn-ghost` classes added in
        // Phase A; this file owns the React-component surface.
        // ---------------------------------------------------------
        // Outlined editorial — ink border, ink text on transparent;
        // hover inverts to ink fill with bone-50 text.
        editorial:
          "border border-[var(--color-ink-900)] bg-transparent text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-bone-50)]",
        // Filled editorial — terracotta fill, bone-50 text. The only
        // permitted body-size terracotta-500 paint per
        // docs/design/contrast.md (text on top is bone-50, not
        // terracotta itself; SC 1.4.11 carve-out at 3:1 applies).
        editorialPrimary:
          "border border-[var(--color-terracotta-500)] bg-[var(--color-terracotta-500)] text-[var(--color-bone-50)] hover:bg-[var(--color-terracotta-600)] hover:border-[var(--color-terracotta-600)]",
        // Ghost editorial — soft hairline-strong border, ink text on
        // transparent; hover lifts the border to full ink-900 without
        // changing background. Used for the header Visit CTA.
        editorialGhost:
          "border border-[var(--color-hairline-strong)] bg-transparent text-[var(--color-ink-900)] hover:border-[var(--color-ink-900)]",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Phase 6 editorial size — 48 px tall, 24 px horizontal pad,
        // 14 px / 0.04 em / uppercase. Sharp corners override the
        // base `rounded-lg`. Pair with the editorial variants above
        // (other size + variant combinations remain valid but are
        // off-spec for the editorial brand).
        editorial:
          "h-12 gap-3 rounded-none px-6 text-sm tracking-[0.04em]",
        // Editorial compact — 40 px tall, used for the header Visit
        // CTA where a 48 px row would crowd the brand mark and nav.
        editorialCompact:
          "h-10 gap-2.5 rounded-none px-4 text-xs tracking-[0.04em]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
