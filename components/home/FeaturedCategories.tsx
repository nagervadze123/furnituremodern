// Phase 5b editorial category showcase.
//
// Three-row layout, each row dedicated to a single category with the
// image / text alternating sides for visual rhythm:
//   • Row 1 (index 0): image LEFT (cols 1-7), text RIGHT (cols 8-12)
//   • Row 2 (index 1): image RIGHT (cols 6-12), text LEFT (cols 1-5)
//   • Row 3 (index 2): image LEFT (cols 1-7), text RIGHT (cols 8-12)
//
// Each row renders:
//   • AspectImage 4/5 with a 1px bone-200 hairline border, subtle 1.01
//     scale on hover (motion-safe; reduced-motion users see static).
//   • Text column with caption-type "01 / 03" eyebrow, display-2 name
//     (locale-correct serif via the Display primitive), body-lg from
//     category.intro (truncated to a sensible visible length), and an
//     anchor-style "View category →" link in ink-900 → terracotta-600
//     (5.80:1 on bone-50, AA-clear; per docs/design/contrast.md).
//
// Mobile: each row collapses to single column (image first, text second),
// full-width, generous gap between rows.
//
// Animation: the parent uses RevealStagger so the three rows cascade
// fade-up as they intersect viewport. Reduced-motion = no transforms.
//
// Categories are pulled from getCategories() (Phase 5 Task 3 — Supabase
// backed). The first three rows render; any beyond are dropped (this is
// the home strip, not the category directory).

import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  AspectImage,
  Body,
  Container,
  Display,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import { getCategories } from "@/lib/data/categories";
import type { DataCategory } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

// Final fallback when neither a DB image_url nor a Supabase URL is
// available. Mirrors the seed catalog's slugs.
const CATEGORY_STOCK_KEYS: Record<string, string> = {
  sofas: "stock/sofa-linen-cream-001.jpg",
  bedrooms: "stock/bed-platform-minimal-001.jpg",
  "tables-chairs": "stock/dining-oak-table-001.jpg",
};

// "View category →" CTA link styling for each row. Exported so the
// element-tree test can assert the painted token directly without
// reaching into the private CategoryRow function (which the harness
// can't enter — vitest runs in node, no React renderer). Phase B
// Slice 4 swept this from terracotta-500 to terracotta-600 (5.80:1
// on bone-50, AA-clear); see docs/design/contrast.md.
export const CATEGORY_CTA_LINK_CLASS =
  "mt-2 inline-flex items-center self-start text-sm font-medium text-[var(--color-ink-900)] transition-colors duration-300 hover:text-[var(--color-terracotta-600)] focus-visible:outline-none focus-visible:text-[var(--color-terracotta-600)]";

function categoryImageUrl(category: DataCategory): string {
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const path = category.imageUrl ?? CATEGORY_STOCK_KEYS[category.slug];
  if (!path) return "/icon.svg";
  if (/^https?:\/\//i.test(path)) return path;
  if (!supabaseBase) return "/icon.svg";
  return `${supabaseBase.replace(/\/$/, "")}/storage/v1/object/public/product-images/${path}`;
}

// Pad to two digits so "01 / 03" renders monospace-clean at every
// position. We don't load a tabular font; the eyebrow is short.
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export async function FeaturedCategories() {
  const t = await getTranslations("home.featured_categories");
  const locale = (await getLocale()) as Locale;

  const allCategories = await getCategories(locale);
  const categories = allCategories.slice(0, 3);

  if (categories.length === 0) {
    // Defensive: never render an empty editorial strip.
    return null;
  }

  const total = pad2(categories.length);

  return (
    <Section
      id="categories"
      aria-labelledby="featured-categories-heading"
      // scroll-mt-20 keeps the sticky header from covering the anchor
      // when the IssueRibbon's "I. Categories" link jumps here.
      className="scroll-mt-20 bg-[var(--color-bone-50)] py-20 md:py-32"
    >
      {/* Visually-hidden h2 lets screen readers announce the section
          even though the visible h2 lives inside each row's heading. */}
      <h2 id="featured-categories-heading" className="sr-only">
        {t("eyebrow")}
      </h2>

      <Container variant="wide">
        <RevealStagger as="div" className="flex flex-col gap-20 md:gap-32">
          {categories.map((cat, idx) => {
            const isImageLeft = idx % 2 === 0;
            const positionLabel = `${pad2(idx + 1)} / ${total}`;

            return (
              <CategoryRow
                key={cat.slug}
                category={cat}
                locale={locale}
                positionLabel={positionLabel}
                isImageLeft={isImageLeft}
                viewLinkLabel={t("view_link")}
              />
            );
          })}
        </RevealStagger>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// CategoryRow — single-row editorial layout
// ---------------------------------------------------------------------------

type CategoryRowProps = {
  category: DataCategory;
  locale: Locale;
  positionLabel: string;
  isImageLeft: boolean;
  viewLinkLabel: string;
};

function CategoryRow({
  category,
  locale,
  positionLabel,
  isImageLeft,
  viewLinkLabel,
}: CategoryRowProps) {
  const imageUrl = categoryImageUrl(category);
  const isFallbackSvg = imageUrl.endsWith(".svg");

  // Trim the intro to a target visible length so the text column reads
  // tight against the image column. Cuts on the nearest word boundary
  // before the cap. Operator-supplied long intros still render in full
  // on the category page itself.
  const intro = truncateAtWord(category.intro[locale], 200);

  // Image / text grid spans differ by row index:
  //   left layout  → image cols 1-7, text cols 8-12
  //   right layout → image cols 6-12, text cols 1-5 (image visually right)
  const imageCols = isImageLeft ? "md:col-span-7" : "md:col-span-7 md:col-start-6";
  const textCols = isImageLeft ? "md:col-span-5" : "md:col-span-5 md:col-start-1 md:row-start-1";

  return (
    <article className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center md:gap-12 lg:gap-16">
      {/* IMAGE */}
      <Reveal variant="fadeIn" className={`min-w-0 ${imageCols}`}>
        <Link
          href={`/${category.slug}`}
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bone-50)]"
          aria-label={category.name[locale]}
        >
          <AspectImage
            ratio="4/5"
            src={imageUrl}
            alt={category.name[locale]}
            sizes="(min-width: 1024px) 56vw, 100vw"
            placeholder={isFallbackSvg ? undefined : "blur"}
            blurDataURL={isFallbackSvg ? undefined : BRAND_PORTRAIT_BLUR}
            unoptimized={isFallbackSvg}
            wrapperClassName="border border-[var(--color-bone-200)] bg-[var(--color-bone-100)]"
            className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.01]"
          />
        </Link>
      </Reveal>

      {/* TEXT */}
      <div className={`flex min-w-0 flex-col gap-5 ${textCols}`}>
        <span className="text-xs uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
          {positionLabel}
        </span>
        <Display variant={2} as="h3" className="break-words">
          {category.name[locale]}
        </Display>
        <Body variant="lg" className="text-[var(--color-ink-700)]">
          {intro}
        </Body>
        <Link
          href={`/${category.slug}`}
          className={CATEGORY_CTA_LINK_CLASS}
        >
          {viewLinkLabel}
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Truncate to the nearest word boundary before `cap` characters. Adds
// an ellipsis only when truncation actually occurred. Keeps trailing
// whitespace clean. Returns the input as-is when shorter than the cap.
function truncateAtWord(input: string, cap: number): string {
  if (input.length <= cap) return input;
  const sliced = input.slice(0, cap);
  const lastSpace = sliced.lastIndexOf(" ");
  const trimmed = (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
  return `${trimmed}…`;
}
