// Barrel for the OG/Twitter image rendering helpers.
//
// Route handlers should import from here rather than reaching into
// individual files — keeps the public API small and lets us refactor
// internals (template structure, font loading) without touching every
// route.

export { OG_DIMENSIONS, SQUARE_DIMENSIONS, OG_CACHE_HEADERS, isSquare } from "./dimensions";
export type { OgDimensions } from "./dimensions";
export {
  loadOgFonts,
  headlineFontFamily,
  subtitleFontFamily,
  OG_FONT_FAMILY,
} from "./fonts";
export type { OgFont } from "./fonts";
export { buildBaseTemplate } from "./templates/base";
export type { BaseTemplateProps } from "./templates/base";
export { buildProductTemplate } from "./templates/product";
export type { ProductTemplateProps } from "./templates/product";
export { buildCategoryTemplate, shortenIntro } from "./templates/category";
export type { CategoryTemplateProps } from "./templates/category";
export { buildErrorTemplate } from "./templates/error";
export type { ErrorTemplateProps } from "./templates/error";
export { renderOgResponse } from "./render";
