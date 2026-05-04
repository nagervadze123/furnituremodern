// Category-page hero — Phase 5 Task 5 follow-up.
//
// Replaces the centred CategoryIntro with an editorial hero that
// matches the home page's aesthetic. Two layouts:
//
//   • imageUrl present  → 60/40 asymmetric prose + image (desktop),
//                         stacked (mobile).
//   • imageUrl absent   → centred minimalist editorial column.
//
// Either way: single <h1> per page (the category name), Display-2
// scale, body-lg intro paragraph, optional eyebrow above the headline.
// Server component — relies on the parent page for breadcrumbs and
// translations.

import {
  AspectImage,
  Body,
  Container,
  Display,
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
  // Display-2 visual scale, but render as <h1> — the category page
  // owns the document's single h1, regardless of which type-scale step
  // we use to size it.
  const heading = (
    <Display
      id="category-headline"
      variant={2}
      as="h1"
      className="break-words"
    >
      {name}
    </Display>
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
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-14 lg:gap-20">
            <RevealStagger
              as="div"
              className="order-2 flex min-w-0 flex-col gap-5 md:order-1 md:col-span-7"
            >
              {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              {heading}
              {body}
            </RevealStagger>
            <Reveal
              variant="imageReveal"
              threshold={0.1}
              className="order-1 min-w-0 md:order-2 md:col-span-5"
            >
              <AspectImage
                ratio="4/5"
                src={imageUrl}
                alt={imageAlt ?? name}
                wrapperClassName="rounded-3xl bg-muted shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)]"
                sizes="(min-width: 1024px) 36vw, 100vw"
                placeholder="blur"
                blurDataURL={BRAND_LANDSCAPE_BLUR}
              />
            </Reveal>
          </div>
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
          className="flex flex-col items-center gap-5 text-center"
        >
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {heading}
          {body}
        </RevealStagger>
      </Container>
    </Section>
  );
}
