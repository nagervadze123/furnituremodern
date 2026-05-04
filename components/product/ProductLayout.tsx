// Product detail layout — Phase 5 Task 5.x follow-up.
//
// Rich, two-column composition designed to do justice to the multi-image
// gallery shipped in Task 5.2. Visible structure (top to bottom):
//
//   1. Breadcrumbs (rendered by the parent route)
//   2. Two-column lockup
//        ├── Left  (lg col-span-7): Gallery
//        └── Right (lg col-span-5): Eyebrow → H1 → price → short
//             description → contact CTA → spec list (<dl>) → availability
//   3. Long-form description ("About this piece")
//   4. Related-products strip (3 cols desktop / 2 mobile)
//   5. Browse {category} CTA back to the category page
//
// All copy is localised. The contact CTA is a `mailto:` link until the
// real cart lands in Phase 6 — subject is pre-filled with the product
// name and slug so the operator can respond to the right item.
//
// Server component. The Gallery itself is a thin server shell that
// renders a client island for the interactive bits (Phase 5 Task 5.2).

import { ArrowRight, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import {
  Body,
  Container,
  Eyebrow,
  Heading,
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

export async function ProductLayout({
  product,
  locale,
  crumbs,
  category,
}: Props) {
  const t = await getTranslations("product");

  // Pull related products from the same category so the strip at the
  // bottom can offer the visitor something else to look at. We over-
  // fetch by 1 to compensate for filtering out the current product.
  const relatedRaw = await getProducts({
    category: category.slug,
    locale,
    limit: RELATED_LIMIT + 1,
  });
  const related = relatedRaw
    .filter((p) => p.slug !== product.slug)
    .slice(0, RELATED_LIMIT);

  const description = product.description[locale] ?? "";
  // Split description into a short lede + remaining body. We split on
  // the first paragraph break so the info column shows a focused
  // summary while the long-form section below shows the full body.
  // When the description is a single paragraph there's no body to show
  // and we suppress the long-form section entirely (would be dupe).
  const splitIdx = description.indexOf("\n\n");
  const lede =
    splitIdx >= 0 ? description.slice(0, splitIdx).trim() : description.trim();
  const longForm =
    splitIdx >= 0 ? description.slice(splitIdx + 2).trim() : "";

  const dim = product.dimensions;
  const dimUnit = dim?.unitCode === "MTR" ? "m" : "cm";
  const weightUnit = product.weight?.unitCode === "GRM" ? "g" : "kg";

  // Build a flat list of spec rows. Empty rows fall out so the <dl>
  // never renders a key/value pair without a value.
  type SpecRow = { label: string; value: string };
  const specs: SpecRow[] = [];
  if (dim?.width != null) {
    specs.push({
      label: t("spec_width"),
      value: `${dim.width} ${dimUnit}`,
    });
  }
  if (dim?.depth != null) {
    specs.push({
      label: t("spec_depth"),
      value: `${dim.depth} ${dimUnit}`,
    });
  }
  if (dim?.height != null) {
    specs.push({
      label: t("spec_height"),
      value: `${dim.height} ${dimUnit}`,
    });
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

  // mailto: link with subject pre-filled. encodeURIComponent for both
  // the subject template and the assembled URL so locale-specific
  // characters survive the address bar.
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

      {/* Main two-column lockup. md+ → 12-col grid, gallery 7 / info 5. */}
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

            <div className="order-2 flex min-w-0 flex-col gap-6 md:col-span-5 md:sticky md:top-24 md:self-start">
              <RevealStagger as="div" className="flex flex-col gap-4">
                {/* Eyebrow → linked back to the parent category. Reads
                    as a small breadcrumb-style link above the heading. */}
                <Eyebrow>
                  <Link
                    href={`/${category.slug}`}
                    className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    {category.name}
                  </Link>
                </Eyebrow>

                <Heading
                  variant={1}
                  as="h1"
                  className="break-words leading-[1.1] tracking-tight"
                >
                  {product.name[locale]}
                </Heading>

                <p className="text-2xl font-medium tabular-nums text-foreground md:text-3xl">
                  {formatPrice(product.price, product.currency, locale)}
                </p>

                {lede ? (
                  <Body
                    variant="lg"
                    className="break-words text-balance"
                  >
                    {lede}
                  </Body>
                ) : null}
              </RevealStagger>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={mailto}
                  className={
                    buttonVariants({ size: "lg" }) +
                    " min-h-11 w-full justify-center gap-2 px-7 sm:w-auto motion-safe:transition-transform motion-safe:hover:scale-[1.02]"
                  }
                >
                  <Mail aria-hidden className="h-4 w-4" />
                  {t("contact_cta")}
                </a>
                {availabilityKey ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t("availability_label")}:{" "}
                    </span>
                    {/* getTranslations does not type-check the string
                        argument here; the runtime key is a known
                        member of the AVAILABILITY_KEY map above. */}
                    {t(availabilityKey as Parameters<typeof t>[0])}
                  </p>
                ) : null}
              </div>

              {specs.length > 0 ? (
                <Reveal variant="fadeIn" threshold={0.05}>
                  <section
                    aria-labelledby={`specs-${product.slug}`}
                    className="rounded-2xl border border-border bg-card/40 p-5 md:p-6"
                  >
                    <h2
                      id={`specs-${product.slug}`}
                      className="font-display text-base font-semibold text-foreground"
                    >
                      {t("specs_heading")}
                    </h2>
                    <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                      {specs.map((row) => (
                        <div key={row.label} className="contents">
                          <dt className="text-muted-foreground">
                            {row.label}
                          </dt>
                          <dd className="break-words text-foreground tabular-nums">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </Reveal>
              ) : null}

              {/* Last-updated freshness signal — a real <time> element so
                  crawlers pick it up as a structured timestamp. Sourced
                  from updated_at, fallback to created_at; emitted only
                  when at least one is available. */}
              {(() => {
                const ts = product.updatedAt ?? product.createdAt;
                if (!ts) return null;
                const formatted = formatLastUpdated(ts, locale);
                if (!formatted) return null;
                return (
                  <p className="text-xs text-muted-foreground">
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
                <Heading
                  variant={2}
                  as="h2"
                  className="mb-5 break-words"
                >
                  {t("long_description_heading")}
                </Heading>
                {/*
                  Split on paragraph breaks so the long-form copy reads
                  like editorial prose rather than one wall of text.
                  We do NOT trust HTML — only plain text — so a hostile
                  description can't inject markup.
                */}
                <div className="flex flex-col gap-4">
                  {longForm.split(/\n{2,}/).map((para, idx) => (
                    <Body
                      key={idx}
                      variant="lg"
                      className="break-words"
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
              <Eyebrow>{category.name}</Eyebrow>
              <Heading variant={2} as="h2" className="break-words">
                {t("related_heading", { category: category.name })}
              </Heading>
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
              className="group inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
