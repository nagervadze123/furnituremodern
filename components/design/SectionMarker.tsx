// Magazine-style section marker — eyebrow typography with a leading
// numeral. Lands in Slice 2 with `IssueRibbon` as its first consumer;
// future home / category / product section bodies (Slice 4+) use the
// same primitive so the numeral format stays consistent across the
// whole editorial system.
//
// Phase 6 — composes the existing `Eyebrow` primitive (12 px / 0.18 em
// / uppercase / 500 / ink-500) and inserts the formatted numeral +
// separator + label as text. Pure typography; no link, no styling
// surface beyond what `Eyebrow` already paints. Wrap in `<Link>` if
// the marker should navigate.
//
// Per `docs/design/contrast.md`, the rendered text is at body size or
// smaller, so it never paints terracotta. The brand accent at body
// size lives elsewhere (the `.eyebrow ::before` hairline in
// globals.css; the home Hero italic accent runs).
//
// Visual reference:
// - `_design-reference/components/page-homepage.jsx:108-114, 145, 208, 245, 276`
// - `_design-reference/components/page-category.jsx:42`
// - `_design-reference/components/page-product.jsx:146`

import type { ComponentPropsWithoutRef } from "react";

import { Eyebrow } from "./Eyebrow";

type Separator = ". " | " · " | " — ";

type SectionMarkerProps = ComponentPropsWithoutRef<"span"> & {
  /** Roman or Arabic numeral, or a "N°NN" prefix. Optional —
      omitting the numeral renders just the label as a plain
      eyebrow, which is sometimes the right choice for a non-numbered
      section. */
  numeral?: string;
  /** Section label. Already-translated text. */
  label: string;
  /** Glyph that joins numeral and label. Defaults to ". " (Roman
      numeral convention); the editorial mocks also use " · " on the
      product page and "N°01 — " on the category page. */
  separator?: Separator;
};

export function SectionMarker({
  numeral,
  label,
  separator = ". ",
  className,
  ...rest
}: SectionMarkerProps) {
  return (
    <Eyebrow className={className} {...rest}>
      {numeral ? `${numeral}${separator}` : ""}
      {label}
    </Eyebrow>
  );
}
