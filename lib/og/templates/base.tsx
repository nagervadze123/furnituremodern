// Base ImageResponse template. Every OG/Twitter route renders through
// this (or one of the specialised wrappers in product.tsx /
// category.tsx / error.tsx) so brand identity stays consistent across
// share previews — same monogram, same accent stripe, same footer.
//
// The component returns a JSX tree compatible with Satori's subset of
// CSS (flexbox + a handful of properties). No state, no client hooks.
// All styling is inline because Satori does not run a CSS engine.

import type { JSX } from "react";

import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";
import { isSquare, OG_DIMENSIONS, type OgDimensions } from "../dimensions";
import { headlineFontFamily, subtitleFontFamily } from "../fonts";

export type BaseTemplateProps = {
  /** Headline text. Required. */
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** Optional uppercase tag rendered above the title. */
  eyebrow?: string;
  /** Footer text. Defaults to the site's bare host. */
  footerText?: string;
  /** Locale picks the display font (ka → Noto Serif Georgian, en → Fraunces). */
  locale: Locale;
  /** Override dimensions; defaults to standard 1200×630. */
  size?: OgDimensions;
  /** Override the monogram letter; defaults to siteConfig.brand.logoMonogram. */
  monogram?: string;
  /** Optional right-side region used by the product template. */
  rightSlot?: JSX.Element;
};

/** A discreet dot-grid pattern rendered as a background SVG data URI. */
const DOT_GRID_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>" +
      "<circle cx='1' cy='1' r='1' fill='#28201a' fill-opacity='0.05'/>" +
      "</svg>"
  );

/**
 * Build the base JSX tree. Returns a full-bleed flex column with a
 * coloured left-accent stripe, a header monogram, the eyebrow + title
 * + subtitle stack, and the footer.
 */
export function buildBaseTemplate(props: BaseTemplateProps): JSX.Element {
  const {
    title,
    subtitle,
    eyebrow,
    footerText,
    locale,
    size = OG_DIMENSIONS,
    monogram = siteConfig.brand.logoMonogram,
    rightSlot,
  } = props;

  const square = isSquare(size);
  const headlineFont = headlineFontFamily(locale);
  const bodyFont = subtitleFontFamily(locale);

  // Layout numbers tuned per-aspect — the OG (1200×630) version is a
  // landscape with ~80px gutters; the square 600 version compresses
  // padding and uses a smaller scale so titles still fit on two lines.
  const padding = square ? 40 : 72;
  const accentBandWidth = square ? 0 : 8;
  const accentBandHeight = square ? 8 : 0;
  const monogramSize = square ? 64 : 88;
  const titleSize = square ? 60 : 96;
  const subtitleSize = square ? 24 : 32;
  const eyebrowSize = square ? 18 : 24;
  const footerSize = square ? 16 : 22;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: siteConfig.brand.background,
        // Subtle dot-grid overlay so the surface has texture without
        // pulling focus from the title.
        backgroundImage: `url("${DOT_GRID_DATA_URI}")`,
        backgroundRepeat: "repeat",
        // Locale-correct headline font, with Fraunces as a fallback
        // for any non-localised Latin glyph (digits, punctuation).
        fontFamily: `"${headlineFont}", "Fraunces", serif`,
        color: siteConfig.brand.foreground,
      }}
    >
      {/* Accent band — vertical strip on landscape, top strip on square. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: square ? "100%" : `${accentBandWidth}px`,
          height: square ? `${accentBandHeight}px` : "100%",
          backgroundColor: siteConfig.brand.accent,
          display: "flex",
        }}
      />

      {/* Header row: monogram + brand name. */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 18,
          padding: `${padding}px ${padding}px 0 ${
            padding + (square ? 0 : accentBandWidth)
          }px`,
        }}
      >
        <div
          style={{
            width: monogramSize,
            height: monogramSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `3px solid ${siteConfig.brand.accent}`,
            color: siteConfig.brand.foreground,
            fontFamily: `"${headlineFont}", "Fraunces", serif`,
            fontSize: monogramSize * 0.55,
            fontWeight: 700,
            lineHeight: 1,
            borderRadius: 4,
          }}
        >
          {monogram}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: square ? 22 : 28,
            color: siteConfig.brand.muted,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: `"${bodyFont}", "Fraunces", serif`,
          }}
        >
          {siteConfig.name}
        </div>
      </div>

      {/* Body region: optional right slot for product/category imagery. */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          padding: `${padding * 0.6}px ${padding}px ${padding}px ${
            padding + (square ? 0 : accentBandWidth)
          }px`,
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            // Reserve a sensible width for the title column so a long
            // headline doesn't push the right slot off the canvas.
            maxWidth: rightSlot && !square ? "62%" : "100%",
            gap: 16,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                fontSize: eyebrowSize,
                color: siteConfig.brand.muted,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: `"${bodyFont}", "Fraunces", serif`,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.05,
              color: siteConfig.brand.foreground,
              fontFamily: `"${headlineFont}", "Fraunces", serif`,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: subtitleSize,
                color: siteConfig.brand.muted,
                lineHeight: 1.3,
                marginTop: 4,
                fontFamily: `"${bodyFont}", "Fraunces", serif`,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {rightSlot ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            {rightSlot}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      {footerText ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: `0 ${padding}px ${padding * 0.7}px ${
              padding + (square ? 0 : accentBandWidth)
            }px`,
            color: siteConfig.brand.muted,
            fontSize: footerSize,
            fontFamily: `"${bodyFont}", "Fraunces", serif`,
            letterSpacing: "0.04em",
          }}
        >
          <span style={{ display: "flex" }}>{footerText}</span>
        </div>
      ) : null}
    </div>
  );
}
