// Category OG template. Title-only layout — large category name,
// shortened intro line, optional "X products" footer. No imagery on
// the right; categories don't have a single hero image.

import type { JSX } from "react";

import type { Locale } from "@/i18n/routing";
import { OG_DIMENSIONS, type OgDimensions } from "../dimensions";
import { buildBaseTemplate } from "./base";

export type CategoryTemplateProps = {
  categoryName: string;
  /** Optional intro line, already trimmed to ~80 chars by the caller. */
  introExcerpt?: string;
  /** Localized "Category" eyebrow. */
  eyebrow?: string;
  /** Optional footer line — typically the bare host or a "X products" caption. */
  footerText?: string;
  locale: Locale;
  size?: OgDimensions;
};

/** Trim a long string to ~maxLen chars on a word boundary. */
export function shortenIntro(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

export function buildCategoryTemplate(
  props: CategoryTemplateProps
): JSX.Element {
  const {
    categoryName,
    introExcerpt,
    eyebrow,
    footerText,
    locale,
    size = OG_DIMENSIONS,
  } = props;

  return buildBaseTemplate({
    title: categoryName,
    subtitle: introExcerpt,
    eyebrow,
    locale,
    size,
    footerText,
  });
}
