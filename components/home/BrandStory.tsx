// Home brand-story strip. Phase 5 Task 5.
//
// Asymmetric editorial layout — image takes 7/12 cols on desktop,
// prose takes 5/12. On mobile they stack: image first (so the visual
// leads), prose second.
//
// The image gets a subtle Parallax (lib/motion). The text uses
// RevealStagger so eyebrow → heading → body cascade in.
//
// Copy lives under home.brand_story.* in messages/{ka,en}.json so the
// operator can refine without touching code.

import { getTranslations } from "next-intl/server";

import {
  AspectImage,
  Body,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { Parallax, Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_LANDSCAPE_BLUR } from "@/lib/perf/blur";

// Brand story uses a wide lifestyle frame. Mirrors the seeded Phase 5
// Task 4 manifest filename. When operator-uploaded story photo lands,
// add `siteConfig.brand.storyImage` and switch this to read from there.
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
      aria-labelledby="brand-story-heading"
      variant="large"
    >
      <Container variant="wide">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-14 lg:gap-20">
          {/* Image column. Desktop: order 1, left. Mobile: order 1, top. */}
          <Reveal
            variant="imageReveal"
            threshold={0.1}
            className="order-1 min-w-0 md:col-span-7"
          >
            <Parallax maxOffset={32}>
              <AspectImage
                ratio="3/2"
                src={src}
                alt={t("image_alt")}
                wrapperClassName="rounded-3xl bg-muted shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)]"
                sizes="(min-width: 1024px) 56vw, 100vw"
                placeholder={isFallbackSvg ? undefined : "blur"}
                blurDataURL={isFallbackSvg ? undefined : BRAND_LANDSCAPE_BLUR}
                unoptimized={isFallbackSvg}
              />
            </Parallax>
          </Reveal>

          {/* Text column. Desktop: order 2, right. Mobile: order 2, below. */}
          <RevealStagger
            as="div"
            className="order-2 flex min-w-0 flex-col gap-5 md:col-span-5"
          >
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <Heading
              id="brand-story-heading"
              variant={1}
              as="h2"
              className="break-words"
            >
              {t("heading")}
            </Heading>
            <Body variant="lg" className="max-w-prose">
              {t("body")}
            </Body>
          </RevealStagger>
        </div>
      </Container>
    </Section>
  );
}
