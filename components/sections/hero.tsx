// Home-page hero. Server component. Image uses next/image with priority
// because it is above the fold and we want it preloaded for LCP.

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

// Resolve siteConfig.brand.heroImage.storageKey into a public URL.
// Phase 5 Task 4 retired picsum and stores the placeholder hero in
// the same Supabase Storage bucket as product photos. When the env
// var is unset (offline/CI), fall back to the brand monogram so the
// component still renders without a remote dependency.
function heroImageUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.svg";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${storageKey}`;
}

export async function Hero() {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;

  // Bilingual alt text for the hero image so screen readers in either
  // locale describe the picture meaningfully. Pulled from site-config so
  // the same alt strings apply when the operator swaps the hero photo.
  const hero = siteConfig.brand.heroImage;
  const heroAlt = hero.alt[locale];
  const heroSrc = heroImageUrl(hero.storageKey);

  return (
    <section
      // The hero never changes per category, so it lives in the home page only.
      // Tall but not full-height: leaves the navigation visible.
      className="relative isolate overflow-hidden"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 md:grid-cols-2 md:items-center md:gap-12 md:px-6 md:py-24 lg:py-32">
        <div className="order-2 min-w-0 md:order-1">
          {/* Headline scales down on small phones. text-3xl ≈ 30px sits
              comfortably at 360px without crowding; we step up at sm/md/lg.
              `text-balance` evens out two-line wraps on cramped widths. */}
          <h1 className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 md:text-lg">
            {t("heroSubtitle")}
          </p>
          {/* CTA group: full-width on the smallest phones so each button
              meets the 44px minimum and never collides with the other.
              At ≥sm the buttons return to their natural width, side by
              side. `flex-wrap` is the safety net for any future third
              CTA — they line-break instead of overflowing. */}
          <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row">
            {/* We style the Link directly with buttonVariants instead of
                using <Button asChild> because the base-nova Button does
                not accept the asChild prop — and nesting <a> inside
                <button> is invalid HTML anyway. min-h-11 enforces the
                touch-target minimum that the `lg` size variant alone
                doesn't guarantee. */}
            <Link
              href="/sofas"
              className={
                buttonVariants({ size: "lg" }) +
                " min-h-11 w-full justify-center px-5 sm:w-auto"
              }
            >
              {t("heroCtaPrimary")}
            </Link>
            <Link
              href="#categories"
              className={
                buttonVariants({ size: "lg", variant: "outline" }) +
                " min-h-11 w-full justify-center px-5 sm:w-auto"
              }
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </div>

        <div className="order-1 min-w-0 md:order-2">
          {/* aspect-[4/5] keeps a fixed footprint for the LCP image
              regardless of the eventual photograph's exact dimensions —
              no layout shift on load, no surprise crop on portrait vs
              landscape source files. */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            <Image
              src={heroSrc}
              alt={heroAlt}
              fill
              // Sized to the largest plausible width on a 1536px viewport,
              // and half the viewport on smaller ones.
              sizes="(min-width: 768px) 50vw, 100vw"
              // priority = preload; this is the LCP image.
              priority
              placeholder="blur"
              blurDataURL={BRAND_PORTRAIT_BLUR}
              className="object-cover"
              // unoptimized when src points at the brand monogram SVG
              // so next/image doesn't try to AVIF/WebP-transform it.
              unoptimized={heroSrc.endsWith(".svg")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
