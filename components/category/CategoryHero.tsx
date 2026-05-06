// Category-page hero — Phase 6 Slice 6 editorial port.
//
// Two layouts:
//
//   • imageUrl present  → asymmetric editorial layout: H1 + lede on
//                         the left half (desktop), 21/9 lead photo
//                         beneath them via AspectFrame. Mobile
//                         stacks H1, lede, photo top-down.
//   • imageUrl absent   → centred minimalist editorial column —
//                         H1 + lede only, no photo well.
//
// Either way: the page's only `<h1>` paints via
// `EditorialHeading variant={1} as="h1"` so it sits at display-1
// scale (the same scale as the homepage hero one notch smaller —
// `display-hero` is the homepage-only step).
//
// AspectFrame at `21/9` is the second consumer of the primitive
// (after the Slice 5 homepage); validates that the API holds across
// two surfaces and across two distinct ratios.
//
// Server component — relies on the parent page for breadcrumbs
// and translations.

import Image from "next/image";

import {
  AspectFrame,
  Body,
  Container,
  EditorialHeading,
  Eyebrow,
  Section,
} from "@/components/design";
import { RevealStagger, Reveal } from "@/lib/motion";
import { BRAND_LANDSCAPE_BLUR } from "@/lib/perf/blur";

type Props = {
  /** Localized category name — becomes the page H1. */
  name: string;
  /** Long-form intro paragraph (80–120 words, full text). */
  intro: string;
  /**
   * Resolved hero image URL for the category. Optional — when omitted
   * the hero falls back to a minimalist centred layout.
   */
  imageUrl?: string;
  /** Localized image alt text. Falls back to category name. */
  imageAlt?: string;
  /** Localized eyebrow (e.g. "Collection" / "კოლექცია"). Optional. */
  eyebrow?: string;
};

export function CategoryHero({
  name,
  intro,
  imageUrl,
  imageAlt,
  eyebrow,
}: Props) {
  // EditorialHeading variant 1 → `.display-1` CSS class, render
  // as <h1>. The category page owns the document's single h1
  // regardless of which type-scale step we use to size it.
  const heading = (
    <EditorialHeading
      id="category-headline"
      variant={1}
      as="h1"
      className="break-words"
    >
      {name}
    </EditorialHeading>
  );

  const body = (
    <Body variant="lg" className="max-w-prose break-words">
      {intro}
    </Body>
  );

  if (imageUrl) {
    return (
      <Section
        aria-labelledby="category-headline"
        variant="default"
        className="pt-10 md:pt-14"
      >
        <Container variant="wide">
          <RevealStagger
            as="div"
            className="flex min-w-0 flex-col gap-7 md:max-w-[68ch]"
          >
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {heading}
            {body}
          </RevealStagger>
          {/* 21:9 cinematic lead photo beneath the prose block.
              AspectFrame's second consumer (after Slice 5) — same
              primitive, new ratio (validates the API). */}
          <Reveal
            variant="imageReveal"
            threshold={0.1}
            className="mt-10 min-w-0 md:mt-14"
          >
            <AspectFrame ratio="21/9">
              <Image
                src={imageUrl}
                alt={imageAlt ?? name}
                fill
                sizes="(min-width: 1024px) 1280px, 100vw"
                placeholder="blur"
                blurDataURL={BRAND_LANDSCAPE_BLUR}
                className="object-cover"
              />
            </AspectFrame>
          </Reveal>
        </Container>
      </Section>
    );
  }

  // Minimalist fallback — centred editorial column. Same scale as the
  // imaged variant, just without the photograph beside it.
  return (
    <Section
      aria-labelledby="category-headline"
      variant="default"
      className="pt-10 md:pt-14"
    >
      <Container variant="narrow">
        <RevealStagger
          as="div"
          className="flex flex-col items-center gap-6 text-center"
        >
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {heading}
          {body}
        </RevealStagger>
      </Container>
    </Section>
  );
}
