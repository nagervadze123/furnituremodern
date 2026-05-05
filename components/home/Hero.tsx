// Phase 5b editorial home hero.
//
// Layout — 12-column grid on desktop, stacked on mobile:
//   • Text column (cols 1-6, vertically centred): eyebrow, oversized
//     display headline, body-lg subhead, two side-by-side CTAs, and a
//     small caption-type meta line.
//   • Image column (cols 7-12): a 4/5 portrait photo with a 1px
//     bone-200 hairline border. No overlay, no text on the image.
//   • Mobile (< 768px): text first, image below — image becomes 3/4
//     full-width, hairline preserved.
//
// Static reveal — no entrance animation. The new design treats the
// hero as a confident statement; an animated reveal would weaken it.
//
// LCP — the right-column image is the LCP candidate. priority=true,
// sizes calibrated for the half-width layout (≈ 50vw on desktop,
// 100vw on mobile). AVIF/WebP delivery comes through next/image.
//
// A11y — the headline carries the page's only h1; section is named
// via aria-labelledby. Image alt text from siteConfig.brand.heroImage.
// Both CTAs are real <Link>s; primary uses solid terracotta, secondary
// uses outlined ink-900. Sharp edges (no border-radius) — editorial.

import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AspectImage, Body, Display, Eyebrow } from "@/components/design";
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
        <div className="order-1 flex min-w-0 flex-col justify-center gap-6 md:col-span-6">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display
            id="hero-headline"
            variant={1}
            className="break-words"
          >
            {t("heading")}
          </Display>
          <Body
            variant="lg"
            className="max-w-xl text-[var(--color-ink-700)]"
          >
            {t("body")}
          </Body>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {/* Primary — solid terracotta-500 → terracotta-600 hover.
                Sharp edges (rounded-none) read as editorial print. */}
            <Link
              href={primaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-none bg-[var(--color-terracotta-500)] px-7 py-[14px] text-base font-medium text-[var(--color-bone-50)] transition-colors hover:bg-[var(--color-terracotta-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bone-50)]"
            >
              {t("cta_primary")}
            </Link>
            {/* Secondary — outlined ink-900 → bone-100 hover. */}
            <Link
              href={secondaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-none border border-[var(--color-ink-900)] bg-[var(--color-bone-50)] px-7 py-[14px] text-base font-medium text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink-900)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bone-50)]"
            >
              {t("cta_secondary")}
            </Link>
          </div>
          {/* Meta strip — small caption type. Pulled from i18n so the
              dot-separated values are operator-editable per locale. */}
          <p className="mt-4 text-xs uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
            {t("meta")}
          </p>
        </div>

        {/* IMAGE COLUMN — cols 7-12 desktop, second on mobile */}
        <div className="order-2 min-w-0 md:col-span-6">
          <AspectImage
            // 4/5 portrait on desktop, 3/4 on mobile — both editorial.
            ratio="4/5"
            src={heroSrc}
            alt={heroAlt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            placeholder={isFallbackSvg ? undefined : "blur"}
            blurDataURL={isFallbackSvg ? undefined : BRAND_PORTRAIT_BLUR}
            unoptimized={isFallbackSvg}
            // 1px bone-200 hairline frame — subtle, premium.
            wrapperClassName="border border-[var(--color-bone-200)]"
          />
        </div>
      </div>
    </section>
  );
}
