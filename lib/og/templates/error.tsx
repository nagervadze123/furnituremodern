// Error / 404 OG template. Used when a share-card route can't resolve
// its data (e.g. a draft product, a category that's been removed) so
// the unfurled image still carries brand identity rather than crashing
// the route handler. Not currently wired to a 404 image route in this
// task — exported for the future not-found.tsx + sitemap-410 pages
// (Plan 5) to reuse without re-implementing the layout.

import type { JSX } from "react";

import type { Locale } from "@/i18n/routing";
import { OG_DIMENSIONS, type OgDimensions } from "../dimensions";
import { buildBaseTemplate } from "./base";

export type ErrorTemplateProps = {
  /** Eyebrow code, defaults to "404". */
  errorCode?: string;
  /** Localised line under the headline ("Page not found" / "გვერდი ვერ მოიძებნა"). */
  message: string;
  locale: Locale;
  size?: OgDimensions;
  footerText?: string;
};

export function buildErrorTemplate(props: ErrorTemplateProps): JSX.Element {
  const {
    errorCode = "404",
    message,
    locale,
    size = OG_DIMENSIONS,
    footerText,
  } = props;

  return buildBaseTemplate({
    title: errorCode,
    subtitle: message,
    eyebrow: undefined,
    locale,
    size,
    footerText,
  });
}
