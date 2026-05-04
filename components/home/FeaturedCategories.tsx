// Home featured-categories strip. Phase 5 Task 5.
//
// Editorial asymmetric grid:
//   • Desktop: one tall "feature" card on the left + a vertical stack
//     of small cards on the right.
//   • Tablet (sm): a 2-column grid where the feature card spans both.
//   • Mobile: a single-column stack — feature first, then the rest.
//
// Each card links to /[locale]/[category]. The first category (highest
// sort_order from the data layer) renders as the feature; up to three
// more render as small cards in the right column. Categories beyond
// the fourth are dropped — this is the home strip, not the directory.
//
// Image source priority:
//   1. category.imageUrl from the DB (operator-set in /admin/categories)
//   2. Hardcoded category-keyed stock fallback (Phase 5 Task 4 photos)
//   3. /icon.svg if Supabase is unconfigured (offline dev / CI)

import { ArrowUpRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  AspectImage,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import { getCategories } from "@/lib/data/categories";
import type { DataCategory } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

// Final fallback when neither a DB image_url nor a Supabase URL is
// available. The keys mirror the slugs the seed catalog ships with so
// the offline build still renders coherent imagery.
const CATEGORY_STOCK_KEYS: Record<string, string> = {
  sofas: "stock/sofa-linen-cream-001.jpg",
  bedrooms: "stock/bed-platform-minimal-001.jpg",
  "tables-chairs": "stock/dining-oak-table-001.jpg",
};

function categoryImageUrl(category: DataCategory): string {
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const path = category.imageUrl ?? CATEGORY_STOCK_KEYS[category.slug];

  if (!path) return "/icon.svg";
  // Operator may set image_url to an absolute URL; pass through as-is.
  if (/^https?:\/\//i.test(path)) return path;
  if (!supabaseBase) return "/icon.svg";
  return `${supabaseBase.replace(/\/$/, "")}/storage/v1/object/public/product-images/${path}`;
}

export async function FeaturedCategories() {
  const t = await getTranslations("home.featured_categories");
  const tCommon = await getTranslations("home");
  const locale = (await getLocale()) as Locale;

  const allCategories = await getCategories(locale);
  // Cap at 4 — one feature + up to three in the side stack.
  const categories = allCategories.slice(0, 4);

  if (categories.length === 0) {
    // Defensive: render nothing rather than an empty grid skeleton.
    return null;
  }

  const [feature, ...rest] = categories;

  return (
    <Section
      id="categories"
      aria-labelledby="featured-categories-heading"
      // scroll-mt-20 keeps the sticky header from covering the anchor
      // when the hero's secondary CTA jumps here.
      className="scroll-mt-20"
    >
      <Container variant="wide">
        <RevealStagger as="div" className="mb-10 flex flex-col gap-3 md:mb-14">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Heading
            id="featured-categories-heading"
            variant={1}
            as="h2"
            className="max-w-2xl"
          >
            {t("heading")}
          </Heading>
        </RevealStagger>

        {/*
          Asymmetric grid:
            • mobile  → single column, feature first
            • sm      → 2 cols, feature spans both (full-width)
            • lg      → 12-col grid, feature on left (7), stack on right (5)
        */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Feature card — tall, dominant. */}
          <Reveal variant="slideUp" className="sm:col-span-2 lg:col-span-7">
            <FeatureCategoryCard
              href={`/${feature.slug}`}
              name={feature.name[locale]}
              tagline={feature.description[locale]}
              imageUrl={categoryImageUrl(feature)}
              imageAlt={feature.name[locale]}
              ctaLabel={tCommon("featured_categories.cta_label")}
            />
          </Reveal>

          {/* Right-hand stack — small cards, vertical on lg, in-grid on sm. */}
          {rest.length > 0 ? (
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 sm:gap-5 lg:col-span-5 lg:grid-cols-1 lg:gap-6">
              {rest.map((cat) => (
                <Reveal key={cat.slug} variant="slideUp">
                  <SideCategoryCard
                    href={`/${cat.slug}`}
                    name={cat.name[locale]}
                    tagline={cat.description[locale]}
                    imageUrl={categoryImageUrl(cat)}
                    imageAlt={cat.name[locale]}
                    ctaLabel={tCommon("featured_categories.cta_label")}
                  />
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Local card variants
// ---------------------------------------------------------------------------
//
// Kept inline rather than extracted to components/ — they're shaped
// specifically for this strip and would only confuse the catalogue's
// reusable CategoryCard if generalized.

type CardProps = {
  href: string;
  name: string;
  tagline: string;
  imageUrl: string;
  imageAlt: string;
  ctaLabel: string;
};

function FeatureCategoryCard({
  href,
  name,
  tagline,
  imageUrl,
  imageAlt,
  ctaLabel,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group relative block min-w-0 overflow-hidden rounded-3xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <AspectImage
        ratio="4/5"
        src={imageUrl}
        alt={imageAlt}
        sizes="(min-width: 1024px) 56vw, (min-width: 640px) 100vw, 100vw"
        placeholder="blur"
        blurDataURL={BRAND_PORTRAIT_BLUR}
        className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]"
        overlay={
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
          />
        }
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-8">
        <div className="min-w-0 max-w-xl">
          <Heading
            variant={2}
            as="h3"
            className="break-words !text-white"
          >
            {name}
          </Heading>
          <p className="mt-2 text-base text-white/85 break-words sm:text-lg">{tagline}</p>
          {/* Hover-revealed eyebrow CTA — opacity-0 by default, fades
              in on group-hover/group-focus-within. motion-safe gates
              the transition for reduced-motion users (they always see
              it visible to keep the affordance discoverable). */}
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium uppercase tracking-[0.18em] text-white/90 motion-safe:opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100 motion-safe:group-focus-within:opacity-100">
            {ctaLabel}
          </span>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="h-6 w-6 shrink-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function SideCategoryCard({
  href,
  name,
  tagline,
  imageUrl,
  imageAlt,
  ctaLabel,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group relative block min-w-0 overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <AspectImage
        ratio="4/5"
        src={imageUrl}
        alt={imageAlt}
        sizes="(min-width: 1024px) 28vw, 50vw"
        placeholder="blur"
        blurDataURL={BRAND_PORTRAIT_BLUR}
        className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]"
        overlay={
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
          />
        }
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-5">
        <div className="min-w-0">
          <Heading
            variant={3}
            as="h3"
            className="break-words !text-white"
          >
            {name}
          </Heading>
          <p className="mt-1 text-sm text-white/85 break-words">{tagline}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/85 motion-safe:opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100 motion-safe:group-focus-within:opacity-100">
            {ctaLabel}
          </span>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
