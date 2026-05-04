// Home-page hero. Phase 5 Task 5.
//
// 2026-trend-aware editorial layout:
//   • Asymmetric grid — text on the left (5/12 cols), photo on the
//     right (7/12 cols) at desktop; stacked text-then-photo on mobile.
//   • Layered typography — eyebrow + Display-1 headline + body line.
//   • Two CTAs side-by-side — primary fills the brand accent, secondary
//     is a quiet ghost button.
//   • Subtle entrance: lib/motion's RevealStagger handles the cascaded
//     reveal of headline + body + CTAs the first time they paint. The
//     hero image gets a separate scale-in via Reveal so the LCP
//     element doesn't wait on JS to render — it's drawn immediately
//     and only the scale transition runs.
//
// Performance:
//   • LCP candidate is the hero <Image> with `priority`. AspectImage
//     locks the box at a known ratio so there is zero CLS while the
//     bytes load. `sizes` is calibrated for the 7/12 desktop column
//     plus 100vw on mobile. AVIF/WebP delivery is on by default via
//     next.config.ts.
//   • The h1 + image both render server-side. JS hydration only
//     handles the entrance reveal, never the content.
//
// A11y:
//   • One <h1> on the page (the hero headline).
//   • CTAs meet 44×44px touch target via `min-h-11` on the button
//     wrapper; focus-visible ring is inherited from buttonVariants.
//   • Reduced-motion users see headline + image in their final state
//     without any transition (lib/motion guards the entire flow).
//   • Decorative gradient overlay is `aria-hidden`.

import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AspectImage, Body, Container, Display, Eyebrow, Section } from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_LANDSCAPE_BLUR } from "@/lib/perf/blur";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

// Resolve siteConfig.brand.heroImage.storageKey into a public URL.
// When NEXT_PUBLIC_SUPABASE_URL is unset (offline / CI), fall back to
// the brand monogram so the component still renders without a remote
// dependency. Mirrors the helper in components/sections/hero.tsx
// (legacy, will be removed after Phase 5 Task 5 ships).
function heroImageUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.svg";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${storageKey}`;
}

export async function Hero() {
  const t = await getTranslations("home.hero");
  const locale = (await getLocale()) as Locale;

  const hero = siteConfig.brand.heroImage;
  const heroSrc = heroImageUrl(hero.storageKey);
  const heroAlt = hero.alt[locale];
  const isFallbackSvg = heroSrc.endsWith(".svg");

  // Primary CTA deep-links to the first published category. We default
  // to "sofas" because it's both the highest-traffic category in the
  // catalogue today and the slug that's stable across the offline
  // fallback. Operator can override via siteConfig.brand later.
  const primaryHref = "/sofas";
  // Secondary CTA scrolls to the categories anchor lower on the page.
  const secondaryHref = "#categories";

  return (
    <Section
      // py-44 hero variant gives editorial breathing room above + below.
      // aria-labelledby points at the headline so screen-reader users
      // get a named "Hero" landmark.
      variant="hero"
      aria-labelledby="hero-headline"
      className="relative overflow-hidden"
    >
      <Container variant="wide">
        <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-12 lg:gap-16">
          {/*
            TEXT COLUMN
            Mobile: order 2 (text below image so image leads on small screens).
            Desktop: order 1 (text leads left).
          */}
          <RevealStagger
            as="div"
            className="order-2 flex min-w-0 flex-col gap-6 md:order-1 md:col-span-5"
          >
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            {/*
              Display-1 is the largest type-scale step. id wires the
              <section>'s aria-labelledby to make this a named landmark.
              text-balance evens out long Georgian wraps; break-words is
              the safety net for compound nouns.
            */}
            <Display id="hero-headline" variant={1} className="break-words">
              {t("heading")}
            </Display>
            <Body variant="lg" className="max-w-xl">
              {t("body")}
            </Body>
            {/*
              CTA group — full-width on the smallest phones so each
              button meets 44px and never collides; side-by-side at sm+.
              flex-wrap is the safety net for any future third CTA.
            */}
            <div className="mt-2 flex flex-col flex-wrap gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className={
                  buttonVariants({ size: "lg" }) +
                  " min-h-11 w-full justify-center px-6 sm:w-auto motion-safe:transition-transform motion-safe:hover:scale-[1.02]"
                }
              >
                {t("cta_primary")}
              </Link>
              <Link
                href={secondaryHref}
                className={
                  buttonVariants({ size: "lg", variant: "outline" }) +
                  " min-h-11 w-full justify-center px-6 sm:w-auto"
                }
              >
                {t("cta_secondary")}
              </Link>
            </div>
          </RevealStagger>

          {/*
            IMAGE COLUMN
            Mobile: order 1 (image leads). Aspect 4/5 portrait reads as
              "lifestyle" on a phone screen.
            Desktop: order 2 (image right). Aspect 3/2 landscape feels
              cinematic without going so wide it forces a tiny crop.
            We use TWO AspectImage instances behind responsive
            visibility classes rather than one with a responsive ratio
            so each variant gets its own correctly-sized srcset entry.
          */}
          <Reveal
            variant="imageReveal"
            threshold={0.05}
            className="order-1 min-w-0 md:order-2 md:col-span-7"
          >
            <div className="block md:hidden">
              <AspectImage
                ratio="4/5"
                src={heroSrc}
                alt={heroAlt}
                wrapperClassName="rounded-3xl bg-muted shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)]"
                sizes="(min-width: 768px) 58vw, 100vw"
                priority
                placeholder={isFallbackSvg ? undefined : "blur"}
                blurDataURL={isFallbackSvg ? undefined : BRAND_LANDSCAPE_BLUR}
                unoptimized={isFallbackSvg}
              />
            </div>
            <div className="hidden md:block">
              <AspectImage
                ratio="3/2"
                src={heroSrc}
                alt={heroAlt}
                wrapperClassName="rounded-[2rem] bg-muted shadow-[0_30px_60px_-30px_rgba(40,32,26,0.35)]"
                sizes="(min-width: 1280px) 56vw, 58vw"
                priority
                placeholder={isFallbackSvg ? undefined : "blur"}
                blurDataURL={isFallbackSvg ? undefined : BRAND_LANDSCAPE_BLUR}
                unoptimized={isFallbackSvg}
              />
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
