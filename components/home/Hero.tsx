// Home-page hero. Cinematic full-bleed redesign.
//
// 2026-trend layout:
//   • Full-viewport hero — image fills the entire section edge-to-edge
//     with a soft gradient overlay so the headline stays readable on
//     top of any photo. Replaces the centred 5/7 grid that used to
//     leave a column of empty paper on either side of the page on
//     wide monitors.
//   • Content (eyebrow + h1 + body + CTAs) anchors to the bottom-left
//     inside the wide editorial container so it lines up with every
//     other section below.
//   • Subtle entrance: lib/motion's RevealStagger handles the cascaded
//     reveal of headline + body + CTAs the first time they paint.
//
// Performance:
//   • LCP candidate is the hero <Image> with `priority`. We use one
//     image instance now (instead of duplicating between mobile/desktop
//     wrappers) — the full-bleed treatment uses object-cover at every
//     breakpoint, and `sizes="100vw"` lets Next pick the right srcset.
//   • The h1 + image both render server-side. JS hydration only
//     handles the entrance reveal, never the content.
//
// A11y:
//   • One <h1> on the page (the hero headline).
//   • CTAs meet 44×44px touch target via `min-h-11` on the button
//     wrapper; focus-visible ring is inherited from buttonVariants.
//   • Reduced-motion users see headline + image in their final state
//     without any transition (lib/motion guards the entire flow).
//   • Decorative gradient overlays are `aria-hidden`.

import Image from "next/image";

import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Body, Display, Eyebrow } from "@/components/design";
import { RevealStagger } from "@/lib/motion";
import { BRAND_LANDSCAPE_BLUR } from "@/lib/perf/blur";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

// Resolve siteConfig.brand.heroImage.storageKey into a public URL.
// When NEXT_PUBLIC_SUPABASE_URL is unset (offline / CI), fall back to
// the brand monogram so the component still renders without a remote
// dependency.
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
    <section
      // Cinematic height: as tall as the viewport allows (using svh so
      // mobile browser chrome doesn't shorten it), with a sensible
      // floor so very tall portrait monitors still get a balanced
      // composition. -mt-16 pulls the section under the sticky header
      // so the photo is genuinely full-bleed; we add equivalent
      // top-padding inside to keep the headline below the chrome.
      aria-labelledby="hero-headline"
      className="relative -mt-16 flex min-h-[78svh] w-full items-end overflow-hidden md:min-h-[92svh]"
    >
      {/*
        BACKGROUND IMAGE
        position:absolute via Next/Image fill so it occupies the full
        section bounds. object-position favours the bottom 35% of the
        photo so faces / focal points generally stay in frame even when
        the aspect ratio crops aggressively at narrow widths.
      */}
      <Image
        src={heroSrc}
        alt={heroAlt}
        fill
        priority
        sizes="100vw"
        placeholder={isFallbackSvg ? undefined : "blur"}
        blurDataURL={isFallbackSvg ? undefined : BRAND_LANDSCAPE_BLUR}
        unoptimized={isFallbackSvg}
        className="object-cover object-[center_60%]"
      />

      {/*
        OVERLAY STACK
        Two layered gradients give us editorial depth without crushing
        the photo. First one darkens the lower 70% so the headline can
        read against any background; second adds a subtle warm vignette
        on the right edge so the composition leans into the type.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"
      />

      {/*
        CONTENT
        Anchored to the bottom-left within the wide editorial cap so it
        sits flush with FeaturedCategories below. pt-32 reserves room
        under the 64px sticky header on every breakpoint.
      */}
      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <RevealStagger
          as="div"
          className="flex max-w-2xl flex-col gap-6 text-white"
        >
          <Eyebrow className="text-white/80">{t("eyebrow")}</Eyebrow>
          <Display
            id="hero-headline"
            variant={1}
            className="break-words !text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          >
            {t("heading")}
          </Display>
          <Body variant="lg" className="max-w-xl !text-white/90">
            {t("body")}
          </Body>
          <div className="mt-2 flex flex-col flex-wrap gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className={
                buttonVariants({ size: "lg" }) +
                " min-h-11 w-full justify-center px-7 sm:w-auto motion-safe:transition-transform motion-safe:hover:scale-[1.02]"
              }
            >
              {t("cta_primary")}
            </Link>
            <Link
              href={secondaryHref}
              className={
                "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/40 bg-white/10 px-7 text-base font-medium text-white backdrop-blur-sm sm:w-auto motion-safe:transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
              }
            >
              {t("cta_secondary")}
            </Link>
          </div>
        </RevealStagger>
      </div>
    </section>
  );
}
