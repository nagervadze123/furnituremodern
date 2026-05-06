// Phase 5b workshop / brand-story strip.
//
// Asymmetric 60/40 editorial layout — image takes 7/12 cols on desktop
// (the visual "60"), prose takes 5/12 (the "40"). On mobile they stack
// (image first, text second) full-width.
//
// The image carries a subtle Parallax (-30px max offset, lib/motion
// gates this on prefers-reduced-motion). Hairline bone-200 border
// frames the photo. The text column reads:
//   • Eyebrow (Workshop)
//   • Heading-1 (Made by hand, in Tbilisi)
//   • Two paragraphs (~80-100 words combined)
//   • Optional "Watch from the workshop →" anchor
//   • Caption-type signature line (operator + role)
//
// Image source — operator-hand-shot photo eventually replaces the stock
// `lifestyle-livingroom-001.jpg` placeholder via `siteConfig.brand`.
//
// Section anchor: id="workshop". The hero's secondary CTA and the
// IssueRibbon's "IV. Workshop" link both jump here.

import Image from "next/image";
import { getTranslations } from "next-intl/server";

import {
  AspectFrame,
  Body,
  Container,
  EditorialHeading,
  Eyebrow,
  Section,
} from "@/components/design";
import { Parallax, Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";

// Same path as Phase 5 placeholder. Operator replaces with a real
// workshop photograph before launch (CHECKLIST item).
const STORY_IMAGE_KEY = "stock/lifestyle-livingroom-001.jpg";

function storyImageUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.svg";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${STORY_IMAGE_KEY}`;
}

export async function BrandStory() {
  const t = await getTranslations("home.brand_story");
  const src = storyImageUrl();
  const isFallbackSvg = src.endsWith(".svg");

  return (
    <Section
      id="workshop"
      aria-labelledby="brand-story-heading"
      className="scroll-mt-20 bg-[var(--color-bone-50)] py-20 md:py-32"
    >
      <Container variant="wide">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-14 lg:gap-20">
          {/* IMAGE — desktop cols 1-7 (60%), mobile order 1 */}
          <Reveal
            variant="fadeIn"
            threshold={0.1}
            className="order-1 min-w-0 md:col-span-7"
          >
            <Parallax maxOffset={30}>
              <AspectFrame ratio="4/5">
                <Image
                  src={src}
                  alt={t("image_alt")}
                  fill
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  placeholder={isFallbackSvg ? undefined : "blur"}
                  blurDataURL={isFallbackSvg ? undefined : BRAND_PORTRAIT_BLUR}
                  unoptimized={isFallbackSvg}
                  className="object-cover"
                />
              </AspectFrame>
            </Parallax>
          </Reveal>

          {/* TEXT — desktop cols 8-12 (40%), mobile order 2 */}
          <RevealStagger
            as="div"
            className="order-2 flex min-w-0 flex-col gap-6 md:col-span-5"
          >
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <EditorialHeading
              id="brand-story-heading"
              variant={2}
              as="h2"
              className="max-w-md break-words"
            >
              {t.rich("heading", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </EditorialHeading>
            <Body variant="lg" className="max-w-md text-[var(--color-ink-700)]">
              {t("body_p1")}
            </Body>
            <Body variant="lg" className="max-w-md text-[var(--color-ink-700)]">
              {t("body_p2")}
            </Body>
            {/* Signature line — small caption type, ink-500. Operator
                supplies the name + role via i18n. */}
            <p className="mt-4 text-xs uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
              {t("signature")}
            </p>
          </RevealStagger>
        </div>
      </Container>
    </Section>
  );
}
