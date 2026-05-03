// Design tokens — the single source of truth for visual constants
// beyond brand identity (which lives in lib/site-config.ts).
//
// These values are also registered as CSS custom properties under the
// @theme directive in app/globals.css so Tailwind v4 can generate
// matching utility classes (bg-surface-0, text-ink-80, p-22, etc.).
// Keep both files in sync — the runtime constants here are imported by
// motion primitives, JSON-LD generators, and any code that needs to
// reason about a token at runtime; the CSS vars are what components
// actually paint with.
//
// Color tokens are OKLCH wherever possible. OKLCH is perceptually
// uniform — same chroma reads as the same vibrancy across hues — so
// generating soft/strong variants by tweaking lightness is predictable.
// Tailwind v4 + modern browsers parse oklch() natively.
//
// We do NOT redefine the existing shadcn token aliases (--background,
// --primary, --accent, etc.). Those continue to live in :root because
// shadcn components reference them by their canonical names. The new
// tokens here are additive — surface/ink/accent scales for design work
// that wants finer control than shadcn's three-stop palette.

// ---------------------------------------------------------------------------
// Color tokens
// ---------------------------------------------------------------------------

/**
 * Surface scale — base canvas (0) through most-elevated card (400).
 *
 * On a light theme, each step is progressively closer to white as you
 * climb elevation: surface-0 is the warm-cream page background; surface-300
 * is the soft "paper" panel under sections; surface-400 is pure white for
 * the most raised cards.
 */
export const surfaces = {
  "0": "oklch(0.99 0.005 80)", // base canvas (warm cream — matches --background)
  "50": "oklch(0.985 0.005 80)",
  "100": "oklch(0.98 0.006 78)",
  "200": "oklch(0.97 0.007 76)",
  "300": "oklch(0.96 0.008 75)", // paper / panel
  "400": "oklch(1 0 0)", // pure white (most raised card)
} as const;

/**
 * Ink scale — text contrast levels.
 *
 * ink-100 is the highest-contrast text (deep neutral charcoal); ink-20
 * is the lightest readable level (placeholder / disabled).
 */
export const ink = {
  "100": "oklch(0.18 0.01 50)", // highest contrast (matches --foreground)
  "80": "oklch(0.22 0.015 60)", // body text
  "60": "oklch(0.45 0.015 60)", // secondary
  "40": "oklch(0.55 0.015 65)", // muted (eyebrows, captions)
  "20": "oklch(0.7 0.012 70)", // placeholder / disabled
} as const;

/**
 * Accent scale — derived from siteConfig.brand.accent (#b85c38 / warm
 * terracotta, expressed as oklch(0.62 0.13 38)). Soft is for low-stakes
 * accent backgrounds (chips, tinted callouts); strong is hover state;
 * muted is a low-saturation chip variant.
 */
export const accent = {
  base: "oklch(0.62 0.13 38)", // matches --accent
  soft: "oklch(0.92 0.04 38)", // tinted background
  strong: "oklch(0.50 0.13 38)", // hover state
  muted: "oklch(0.78 0.05 38)", // chip / badge low-saturation
} as const;

/**
 * Semantic single-tone tokens. Intentionally no scale — UI signals
 * benefit from one well-chosen color per intent rather than a gradient.
 */
export const semantic = {
  success: "oklch(0.65 0.15 145)",
  warning: "oklch(0.78 0.15 80)",
  error: "oklch(0.60 0.20 25)",
  info: "oklch(0.60 0.13 230)",
} as const;

/**
 * Border tokens. `subtle` is the light divider between rows in dense
 * lists; `default` matches the existing --border CSS variable; `strong`
 * is for emphasized boundaries (e.g. focused card outline).
 */
export const border = {
  subtle: "oklch(0.93 0.005 75)",
  default: "oklch(0.91 0.008 75)", // matches --border
  strong: "oklch(0.85 0.01 75)",
} as const;

/** Aggregated color tokens for runtime consumption. */
export const colors = {
  surface: surfaces,
  ink,
  accent,
  semantic,
  border,
} as const;

// ---------------------------------------------------------------------------
// Spacing tokens (extension only — Tailwind keeps its base 4px scale)
// ---------------------------------------------------------------------------

/**
 * Premium spacing stops added on top of Tailwind's defaults. These are
 * tuned for editorial layouts: 18 / 22 are section paddings, 30 / 36 /
 * 44 power generous hero sections.
 */
export const spacing = {
  "18": "4.5rem", // 72px
  "22": "5.5rem", // 88px
  "30": "7.5rem", // 120px
  "36": "9rem", // 144px
  "44": "11rem", // 176px
} as const;

// ---------------------------------------------------------------------------
// Typography tokens
// ---------------------------------------------------------------------------

/**
 * Font family CSS variables. The next/font setup in app/layout.tsx
 * registers these as `--font-display` (Fraunces), `--font-body` (Inter),
 * `--font-georgian-serif` (Noto Serif Georgian), `--font-georgian-sans`
 * (Noto Sans Georgian).
 *
 * `display` and `body` resolve via the locale-aware swap declared in
 * app/globals.css ([lang="ka"] / [lang="en"] selector pair); use those
 * when you don't know or care which script is active. Locale-specific
 * variants (displayKa, bodyEn, etc.) are still exported for the rare
 * case where you need to lock a family regardless of the lang attribute.
 */
export const fontFamilies = {
  displayKa: "var(--font-georgian-serif)",
  displayEn: "var(--font-display)",
  bodyKa: "var(--font-georgian-sans)",
  bodyEn: "var(--font-body)",
  display: "var(--font-display-locale)",
  body: "var(--font-body-locale)",
} as const;

type TypeVariant = {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
};

/**
 * Type scale. Every variant declares font-size, line-height and
 * letter-spacing — the three properties you actually need to specify
 * for typography to feel intentional. Sizes are rem so user font-size
 * preferences propagate.
 */
export const typography = {
  "display-1": {
    fontSize: "4rem",
    lineHeight: "1.05",
    letterSpacing: "-0.03em",
  },
  "display-2": {
    fontSize: "3rem",
    lineHeight: "1.08",
    letterSpacing: "-0.02em",
  },
  "heading-1": {
    fontSize: "2.25rem",
    lineHeight: "1.15",
    letterSpacing: "-0.015em",
  },
  "heading-2": {
    fontSize: "1.75rem",
    lineHeight: "1.2",
    letterSpacing: "-0.01em",
  },
  "heading-3": {
    fontSize: "1.375rem",
    lineHeight: "1.3",
    letterSpacing: "0",
  },
  "body-lg": {
    fontSize: "1.125rem",
    lineHeight: "1.65",
    letterSpacing: "0",
  },
  body: {
    fontSize: "1rem",
    lineHeight: "1.7",
    letterSpacing: "0",
  },
  "body-sm": {
    fontSize: "0.875rem",
    lineHeight: "1.6",
    letterSpacing: "0",
  },
  caption: {
    fontSize: "0.75rem",
    lineHeight: "1.5",
    letterSpacing: "0.02em",
  },
} as const satisfies Record<string, TypeVariant>;

// ---------------------------------------------------------------------------
// Radius tokens
// ---------------------------------------------------------------------------

export const radius = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

// ---------------------------------------------------------------------------
// Shadow tokens
// ---------------------------------------------------------------------------

/**
 * Premium multi-layered shadows — softer and larger than Material
 * Design defaults. `focus` is a 3px outer ring that uses accent-soft
 * for an AAA-friendly visual focus indicator (3px ≥ WCAG 2.2 1.4.13).
 */
export const shadow = {
  soft: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)",
  medium: "0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
  large: "0 4px 8px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.08)",
  focus: "0 0 0 3px oklch(0.92 0.04 38)", // accent-soft
} as const;

// ---------------------------------------------------------------------------
// Z-index tokens
// ---------------------------------------------------------------------------

/**
 * Named stacking contexts. Use these instead of magic numbers so layer
 * decisions are documented and the order is always consistent.
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  stickyHeader: 20,
  banner: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
} as const;

// ---------------------------------------------------------------------------
// Breakpoint tokens
// ---------------------------------------------------------------------------

/** Pixel widths matching Tailwind's default sm/md/lg/xl/2xl breakpoints. */
export const breakpoint = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1536,
} as const;

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export const tokens = {
  colors,
  spacing,
  fontFamilies,
  typography,
  radius,
  shadow,
  zIndex,
  breakpoint,
} as const;

export type Tokens = typeof tokens;
export type SurfaceKey = keyof typeof surfaces;
export type InkKey = keyof typeof ink;
export type AccentKey = keyof typeof accent;
export type TypographyVariant = keyof typeof typography;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadow;
