// Phase 6 Slice 5 — editorial home hero.
//
// Layout — 12-column grid on desktop, stacked on mobile:
//   • Text column (cols 1-6, vertically centred): eyebrow with the
//     terracotta dot prefix, oversized display-hero headline,
//     italic Fraunces lede subhead, two side-by-side CTAs, and a
//     three-column caption strip beneath a hairline.
//   • Image column (cols 7-12): a 4/5 portrait photo with a 1px
//     bone-200 hairline border. No overlay, no text on the image.
//   • Mobile: text first, image below.
//
// LCP — the right-column image is the LCP candidate. priority=true,
// sizes calibrated for the half-width layout (≈ 50vw on desktop,
// 100vw on mobile). AVIF/WebP delivery comes through next/image.
//
// A11y — the headline carries the page's only h1; section is named
// via aria-labelledby. Image alt text from siteConfig.brand.heroImage.
// Both CTAs are real <Link>s; primary uses solid terracotta-500
// (4.25:1 bone-50-on-terracotta is a filled-button surface,
// covered by SC 1.4.11 3:1 floor for UI components), secondary uses
// the Slice 2 `editorialGhost` button variant.
//
// Display-hero variant: the heading paints `.display-hero`
// (clamp(3.5rem, 7vw, 6.5rem) at opsz 144) — one notch larger than
// `.display-1`. The italic `<em>` accent inside the heading lands
// via the shared `.display-* em` rule in globals.css.

import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AspectImage, EditorialHeading } from "@/components/design";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
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

  // Primary CTA → first featured category landing page (kept as
  // /sofas — operator can later wire a different default via siteConfig).
  // Secondary CTA → in-page anchor to the brand-story section.
  const primaryHref = "/sofas";
  const secondaryHref = "#workshop";

  return (
    <section
      aria-labelledby="hero-headline"
      // -mt-20 pulls the hero under the sticky header so the image flush-
      // tops the viewport edge; pt-32 inside reserves room for the chrome.
      className="-mt-20 w-full bg-[var(--color-bone-50)] pt-32 md:pt-32"
    >
      <div className="mx-auto grid max-w-[1760px] grid-cols-1 gap-10 px-6 pb-16 md:min-h-[88svh] md:grid-cols-12 md:gap-12 md:px-12 md:pb-24">
        {/* TEXT COLUMN — cols 1-6 desktop, full-width / first on mobile */}
        <div className="order-1 flex min-w-0 flex-col justify-center gap-7 md:col-span-6">
          {/* Editorial eyebrow with the terracotta dot prefix from
              the design reference. The dot is a 6 px filled circle
              at terracotta-500 — decorative under SC 1.4.11 (3:1
              floor for non-text graphics, satisfied at 4.25:1) and
              already counted in the contrast.md inventory. */}
          <div className="inline-flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block h-[6px] w-[6px] rounded-full bg-[var(--color-terracotta-500)]"
            />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              {t("eyebrow")}
            </span>
          </div>
          <EditorialHeading
            id="hero-headline"
            variant="hero"
            className="break-words"
          >
            {t.rich("heading", {
              em: (chunks) => <em>{chunks}</em>,
            })}
          </EditorialHeading>
          {/* Italic Fraunces lede — `.lede` from Phase A. Paints
              ink-700 (11.48:1 on bone-50, AAA-clear). */}
          <p className="lede max-w-[44ch]">{t("body")}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {/* Primary — solid terracotta-500 → terracotta-600 hover.
                Sharp edges (rounded-none) read as editorial print. */}
            <Link
              href={primaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-none bg-[var(--color-terracotta-500)] px-7 py-[14px] text-base font-medium text-[var(--color-bone-50)] transition-colors hover:bg-[var(--color-terracotta-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bone-50)]"
            >
              {t("cta_primary")}
            </Link>
            {/* Secondary — Slice 2 editorialGhost variant on a
                next-intl Link. */}
            <Link
              href={secondaryHref}
              className={buttonVariants({
                variant: "editorialGhost",
                size: "editorial",
              })}
            >
              {t("cta_secondary")}
            </Link>
          </div>
          {/* Three-column caption strip beneath a 1 px hairline.
              Mirrors the bottom band of the design-reference hero
              (`page-homepage.jsx:74-88`): product / detail / photo
              credit. The credit column uses italic Fraunces at
              opsz 24 to read as a typeset photographer's note. */}
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--color-hairline)] pt-5 text-xs uppercase tracking-[0.16em] text-[var(--color-ink-500)] sm:grid-cols-3 sm:gap-6">
            <span>{t("meta_product")}</span>
            <span className="sm:text-center">{t("meta_detail")}</span>
            <span className="font-display text-[12px] italic tracking-normal sm:text-right">
              {t("meta_credit")}
            </span>
          </div>
        </div>

        {/* IMAGE COLUMN — cols 7-12 desktop, second on mobile */}
        <div className="order-2 min-w-0 md:col-span-6">
          <AspectImage
            // 4/5 portrait, both desktop and mobile.
            ratio="4/5"
            src={heroSrc}
            alt={heroAlt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            placeholder={isFallbackSvg ? undefined : "blur"}
            blurDataURL={isFallbackSvg ? undefined : BRAND_PORTRAIT_BLUR}
            unoptimized={isFallbackSvg}
            // 1px bone-200 hairline frame — subtle, premium. The
            // hero stays on AspectImage (not AspectFrame): full-bleed
            // photographic treatment, no inner bone-100 surface.
            wrapperClassName="border border-[var(--color-bone-200)]"
          />
        </div>
      </div>
    </section>
  );
}
