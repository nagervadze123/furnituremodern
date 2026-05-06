// Product detail layout — Phase 6 Slice 7 editorial port.
//
// Two-column lockup:
//
//   1. Breadcrumbs (rendered above the lockup)
//   2. md+ grid: gallery 7/12 left, sticky info column 5/12 right
//        ├── Eyebrow back-to-category link (ink-700; brass-500
//        │   from the design ref fails AA at this size — see
//        │   docs/design/contrast.md "Why brass-500 is footer-only")
//        ├── EditorialHeading variant 2 H1 (display-2 scale)
//        ├── Italic Latin caption (Fraunces 18 px ink-500) when
//        │   the product carries an SKU
//        ├── Hairline-bordered price strip (display-step price)
//        ├── Lede paragraph
//        ├── Status pill (sage-500 dot + ink-700 caption when
//        │   InStock; ink-300 dot + ink-500 caption otherwise —
//        │   see component-level comment for the rationale)
//        ├── Editorial primary CTA (Slice 2 editorialPrimary
//        │   variant) wired to the existing mailto: target —
//        │   visual port only, no commerce flow change
//        └── Specs <dl> — two-col grid (1fr 1.2fr), eyebrow terms,
//             font-display ink-900 values, hairline row separators
//   3. Long-form description ("About this piece")
//   4. Related-products strip
//   5. Back-to-category CTA
//
// Sticky offset: `md:top-[110px]` mirrors the design reference
// (page-product.jsx:50). The site header is `sticky top-0 z-40`
// (~80 px expanded / ~56 px on scroll); 110 px clears the chrome
// with a comfortable buffer so the eyebrow doesn't tuck under the
// header on scroll.
//
// JSON-LD: this component renders no schema blocks itself — the
// parent route (app/[locale]/[category]/[slug]/page.tsx) emits
// productJsonLd via lib/schema.ts. The Slice 7 contract is "the
// schema layer is not in this PR's diff", verified by the
// byte-identity gate in lib/schema.test.ts.
//
// Server component. The Gallery is a thin server shell that mounts
// gallery-client.tsx as a client island for the interactive bits
// (Phase 5 Task 5.2) — Slice 7 does not touch that file.

import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import {
  Body,
  Container,
  EditorialHeading,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { Gallery } from "@/components/product/gallery";
import { ProductCard } from "@/components/sections/product-card";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { getProducts } from "@/lib/data/products";
import { siteConfig } from "@/lib/site-config";
import {
  formatLastUpdated,
  LAST_UPDATED_LABEL,
} from "@/lib/aeo/summary";
import type {
  DataProduct,
  ProductAvailability,
} from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

type Props = {
  product: DataProduct;
  locale: Locale;
  /** Visible breadcrumb trail rendered above the gallery. */
  crumbs: BreadcrumbCrumb[];
  /** Localised category name + canonical slug for back-link. */
  category: { name: string; slug: string };
};

const AVAILABILITY_KEY: Record<ProductAvailability, string> = {
  InStock: "availability_in_stock",
  OutOfStock: "availability_out_of_stock",
  PreOrder: "availability_pre_order",
  BackOrder: "availability_back_order",
};

const RELATED_LIMIT = 4;

/**
 * Italic Fraunces caption beneath the H1 — Latin name + SKU.
 *
 * Locale-independent by design: this is the bilingual editorial
 * pairing (mirrors _design-reference/components/page-product.jsx:57-62),
 * not a localized field. The Latin name renders on both /ka and /en
 * so the rhythm holds regardless of the page locale.
 *
 * Falls through to `null` cleanly when neither name.en nor SKU is
 * available, so the paragraph is not emitted at all rather than
 * shipping a `"undefined — N°…"` artifact.
 *
 * Lifted to a module-level export so the test can exercise the
 * truthy/empty/missing matrix without rendering the full layout.
 */
export function getProductCaption(product: {
  name: { en: string };
  sku?: string | null;
}): string | null {
  const parts: string[] = [];
  if (product.name.en) {
    parts.push(product.name.en);
  }
  if (product.sku) {
    parts.push(`N°${product.sku}`);
  }
  return parts.length > 0 ? parts.join(" — ") : null;
}

export async function ProductLayout({
  product,
  locale,
  crumbs,
  category,
}: Props) {
  const t = await getTranslations("product");

  // Pull related products from the same category so the strip at
  // the bottom can offer the visitor something else to look at.
  // Over-fetch by 1 to compensate for filtering out the current
  // product.
  const relatedRaw = await getProducts({
    category: category.slug,
    locale,
    limit: RELATED_LIMIT + 1,
  });
  const related = relatedRaw
    .filter((p) => p.slug !== product.slug)
    .slice(0, RELATED_LIMIT);

  const description = product.description[locale] ?? "";
  const splitIdx = description.indexOf("\n\n");
  const lede =
    splitIdx >= 0 ? description.slice(0, splitIdx).trim() : description.trim();
  const longForm =
    splitIdx >= 0 ? description.slice(splitIdx + 2).trim() : "";

  const dim = product.dimensions;
  const dimUnit = dim?.unitCode === "MTR" ? "m" : "cm";
  const weightUnit = product.weight?.unitCode === "GRM" ? "g" : "kg";

  type SpecRow = { label: string; value: string };
  const specs: SpecRow[] = [];
  if (dim?.width != null) {
    specs.push({ label: t("spec_width"), value: `${dim.width} ${dimUnit}` });
  }
  if (dim?.depth != null) {
    specs.push({ label: t("spec_depth"), value: `${dim.depth} ${dimUnit}` });
  }
  if (dim?.height != null) {
    specs.push({ label: t("spec_height"), value: `${dim.height} ${dimUnit}` });
  }
  if (product.weight?.value != null) {
    specs.push({
      label: t("spec_weight"),
      value: `${product.weight.value} ${weightUnit}`,
    });
  }
  if (product.material) {
    specs.push({ label: t("spec_material"), value: product.material });
  }
  if (product.color) {
    specs.push({ label: t("spec_color"), value: product.color });
  }
  if (product.sku) {
    specs.push({ label: t("spec_sku"), value: product.sku });
  }

  const availability = product.availability;
  const availabilityKey = availability ? AVAILABILITY_KEY[availability] : null;
  const isInStock = availability === "InStock";

  // Italic Fraunces caption beneath the H1 — bilingual editorial
  // pairing. Locale-independent: see `getProductCaption` doc.
  const caption = getProductCaption(product);

  // mailto: link with subject pre-filled — preserved from the
  // pre-port behaviour. Slice 7 is a visual port; commerce flow
  // does not change.
  const mailSubject = t("contact_subject", {
    name: product.name[locale],
    slug: product.slug,
  });
  const mailto = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
    mailSubject
  )}`;

  return (
    <>
      <Container variant="wide" className="pt-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </Container>

      <Section variant="default" className="pt-6 md:pt-10">
        <Container variant="wide">
          <article className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
            <div className="order-1 min-w-0 md:col-span-7">
              <Gallery
                images={product.images}
                locale={locale}
                productName={product.name[locale]}
              />
            </div>

            {/* Sticky info column: 110 px top clears the editorial
                site header (sticky top-0, ~80 px expanded). The
                offset matches _design-reference/components/page-product.jsx:50. */}
            <div className="order-2 flex min-w-0 flex-col gap-7 md:col-span-5 md:sticky md:top-[110px] md:self-start">
              <RevealStagger as="div" className="flex flex-col gap-4">
                {/* Back-to-category eyebrow link. The design ref
                    paints this in brass-500; that swatch measures
                    3.29:1 on bone-50 and fails AA at the 12 px
                    eyebrow size. See docs/design/contrast.md
                    "Why brass-500 is footer-only" for the
                    substitution rationale. */}
                <Link
                  href={`/${category.slug}`}
                  className="inline-flex w-fit items-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-700)] underline decoration-[var(--color-ink-700)] decoration-1 underline-offset-[6px] transition-colors hover:text-[var(--color-ink-900)] focus-visible:outline-none focus-visible:text-[var(--color-ink-900)]"
                >
                  {category.name}
                </Link>

                <EditorialHeading
                  variant={2}
                  as="h1"
                  className="break-words"
                >
                  {product.name[locale]}
                </EditorialHeading>

                {caption ? (
                  <p className="font-display text-[18px] italic font-light text-[var(--color-ink-500)]">
                    {caption}
                  </p>
                ) : null}
              </RevealStagger>

              {/* Hairline-bordered price band. Display-step price
                  on the left, GEL caption on the right — reads as
                  a deliberate stop, not a card surface. */}
              <div className="flex items-baseline gap-4 border-y border-[var(--color-bone-200)] py-5">
                <p className="font-display text-[clamp(1.875rem,3vw,2.25rem)] tabular-nums tracking-[-0.02em] text-[var(--color-ink-900)]">
                  {formatPrice(product.price, product.currency, locale)}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  {product.currency}
                </p>
              </div>

              {lede ? (
                <Body
                  variant="lg"
                  className="break-words text-balance text-[var(--color-ink-700)]"
                >
                  {lede}
                </Body>
              ) : null}

              {availabilityKey ? (
                <div className="flex items-center gap-3">
                  {/* Status pill: sage-500 dot at 4.21:1 (clears
                      SC 1.4.11 3:1 floor for non-text graphics)
                      when InStock; muted ink-300 dot otherwise.
                      Caption text is the information path —
                      ink-700 for InStock (11.48:1, AAA-clear),
                      ink-500 for other states (5.59:1, AA-clear).
                      The dot is `aria-hidden` so the status is
                      conveyed by text alone for assistive tech. */}
                  <span
                    aria-hidden="true"
                    className={
                      "inline-block h-2 w-2 rounded-full " +
                      (isInStock
                        ? "bg-[var(--color-sage-500)]"
                        : "bg-[var(--color-ink-300)]")
                    }
                  />
                  <span
                    className={
                      "text-sm " +
                      (isInStock
                        ? "text-[var(--color-ink-700)]"
                        : "text-[var(--color-ink-500)]")
                    }
                  >
                    {t(availabilityKey as Parameters<typeof t>[0])}
                  </span>
                </div>
              ) : null}

              <a
                href={mailto}
                className={buttonVariants({
                  variant: "editorialPrimary",
                  size: "editorial",
                  className: "w-full justify-center sm:w-auto",
                })}
              >
                {t("contact_cta")}
              </a>

              {specs.length > 0 ? (
                <Reveal variant="fadeIn" threshold={0.05}>
                  <section
                    aria-labelledby={`specs-${product.slug}`}
                    className="border-t border-[var(--color-bone-200)] pt-6"
                  >
                    <h2
                      id={`specs-${product.slug}`}
                      className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]"
                    >
                      {t("specs_heading")}
                    </h2>
                    {/* Two-column spec grid — eyebrow terms in the
                        narrower column, font-display values in the
                        wider one. `border-t` on the wrapper plus
                        `border-b` on every <dt> + <dd> draws the
                        editorial hairline rule between rows
                        without resorting to background tricks. */}
                    <dl className="mt-5 grid grid-cols-[1fr_1.2fr] gap-x-6">
                      {specs.map((row) => (
                        <div key={row.label} className="contents">
                          <dt className="border-b border-[var(--color-bone-200)] py-3.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                            {row.label}
                          </dt>
                          <dd className="break-words border-b border-[var(--color-bone-200)] py-3.5 font-display text-sm tabular-nums text-[var(--color-ink-900)]">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </Reveal>
              ) : null}

              {/* Last-updated freshness signal — a real <time>
                  element so crawlers pick it up as a structured
                  timestamp. Sourced from updated_at, fallback to
                  created_at; emitted only when at least one is
                  available. */}
              {(() => {
                const ts = product.updatedAt ?? product.createdAt;
                if (!ts) return null;
                const formatted = formatLastUpdated(ts, locale);
                if (!formatted) return null;
                return (
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    {LAST_UPDATED_LABEL[locale]}:{" "}
                    <time dateTime={ts}>{formatted}</time>
                  </p>
                );
              })()}
            </div>
          </article>
        </Container>
      </Section>

      {longForm ? (
        <Section variant="default" className="pt-0">
          <Container variant="default">
            <Reveal variant="slideUp">
              <div className="mx-auto max-w-2xl">
                <EditorialHeading
                  variant={3}
                  as="h2"
                  className="mb-5 break-words"
                >
                  {t("long_description_heading")}
                </EditorialHeading>
                <div className="flex flex-col gap-4">
                  {longForm.split(/\n{2,}/).map((para, idx) => (
                    <Body
                      key={idx}
                      variant="lg"
                      className="break-words text-[var(--color-ink-700)]"
                    >
                      {para}
                    </Body>
                  ))}
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section variant="large">
          <Container variant="wide">
            <RevealStagger
              as="div"
              className="mb-8 flex flex-col gap-2 md:mb-12"
            >
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                {category.name}
              </span>
              <EditorialHeading variant={2} as="h2" className="break-words">
                {t("related_heading", { category: category.name })}
              </EditorialHeading>
            </RevealStagger>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-12">
              {related.map((p, index) => (
                <li key={p.id} className="min-w-0">
                  <Reveal
                    variant="slideUp"
                    threshold={0.15}
                    style={{
                      transitionDelay: `${Math.min(index, 3) * 60}ms`,
                    }}
                  >
                    <div className="motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-0.5">
                      <ProductCard
                        product={p}
                        listName={`related_${category.slug}`}
                      />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section variant="default" className="pt-0">
        <Container variant="default">
          <div className="mx-auto flex max-w-xl items-center justify-center">
            <Link
              href={`/${category.slug}`}
              className={buttonVariants({
                variant: "editorialGhost",
                size: "editorial",
                className: "group gap-2",
              })}
            >
              {t("back_to_category", { category: category.name })}
              <ArrowRight
                aria-hidden
                className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
