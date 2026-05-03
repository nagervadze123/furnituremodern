// Barrel for the design token module. Import from "@/lib/design"
// rather than reaching directly into ./tokens — the surface here is
// frozen, so a re-export shuffle inside the module is invisible to
// consumers.

export {
  tokens,
  surfaces,
  ink,
  accent,
  semantic,
  border,
  colors,
  spacing,
  fontFamilies,
  typography,
  radius,
  shadow,
  zIndex,
  breakpoint,
} from "./tokens";

export type {
  Tokens,
  SurfaceKey,
  InkKey,
  AccentKey,
  TypographyVariant,
  RadiusKey,
  ShadowKey,
} from "./tokens";
