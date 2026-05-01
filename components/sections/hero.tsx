// Home-page hero. Server component. Image uses next/image with priority
// because it is above the fold and we want it preloaded for LCP.

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

export async function Hero() {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;

  // Bilingual alt text for the hero image so screen readers in either
  // locale describe the picture meaningfully.
  const heroAlt =
    locale === "ka"
      ? "თანამედროვე მისაღები ოთახი დივნით და მუხის მაგიდით"
      : "Modern living room with a linen sofa and oak coffee table";

  return (
    <section
      // The hero never changes per category, so it lives in the home page only.
      // Tall but not full-height: leaves the navigation visible.
      className="relative isolate overflow-hidden"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:gap-12 md:px-6 md:py-24 lg:py-32">
        <div className="order-2 md:order-1">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* We style the Link directly with buttonVariants instead of
                using <Button asChild> because the base-nova Button does
                not accept the asChild prop — and nesting <a> inside
                <button> is invalid HTML anyway. */}
            <Link
              href="/sofas"
              className={buttonVariants({ size: "lg" })}
            >
              {t("heroCtaPrimary")}
            </Link>
            <Link
              href="#categories"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            <Image
              src="https://picsum.photos/seed/fm-hero/1200/1500"
              alt={heroAlt}
              fill
              // Sized to the largest plausible width on a 1536px viewport,
              // and half the viewport on smaller ones.
              sizes="(min-width: 768px) 50vw, 100vw"
              // priority = preload; this is the LCP image.
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
