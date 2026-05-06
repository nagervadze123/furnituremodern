// Phase 5b signature-products section.
//
// Shows up to 8 published products as editorial cards in a 4-col
// desktop grid (2-col tablet, 1-col mobile). The card design is
// deliberately stripped down — image, name (serif), price, optional
// metadata caption. No hover overlay, no "shop now" button, no shadow.
// The whole card is a link; hover scales the image only (1.01, motion-
// safe), and a hairline bone-200 border appears on the wrapper.
//
// SEO — the home-only ItemList JSON-LD remains, anchored at
// `/{locale}#signature-products`. Distinct from the category-page
// ItemList so Google treats them as separate rich results.

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import {
  Body,
  Container,
  EditorialHeading,
  Eyebrow,
  Section,
} from "@/components/design";
import { JsonLd } from "@/components/json-ld";
import { Reveal, RevealStagger } from "@/lib/motion";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import { formatPrice } from "@/lib/format";
import { getProducts } from "@/lib/data/products";
import { homeSignatureItemListJsonLd } from "@/lib/schema";
import type { DataProduct } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

const SIGNATURE_LIMIT = 8;

export async function SignatureProducts() {
  const t = await getTranslations("home.signature_products");
  const locale = (await getLocale()) as Locale;

  // Pull recent published products. Data layer orders by sort_order
  // ascending, which the operator controls — keeps "newest piece on
  // top" possible without changing the query.
  const products = await getProducts({ limit: SIGNATURE_LIMIT, locale });
  if (products.length === 0) return null;

  // Per-request CSP nonce so the inline ItemList script tag survives
  // the strict CSP. Same contract as the layout-level JSON-LD blocks.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <Section
      id="signature"
      aria-labelledby="signature-products-heading"
      className="scroll-mt-20 bg-[var(--color-bone-50)] py-20 md:py-32"
    >
      <JsonLd
        id="ld-home-signature-itemlist"
        data={homeSignatureItemListJsonLd({
          locale,
          name: t("heading"),
          description: t("intro"),
          products,
        })}
        nonce={nonce}
      />

      <Container variant="wide">
        <div className="mb-12 flex flex-col gap-4 md:mb-16">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <EditorialHeading
            id="signature-products-heading"
            variant={2}
            as="h2"
            className="max-w-2xl"
          >
            {t("heading")}
          </EditorialHeading>
          <Body
            variant="default"
            className="max-w-2xl text-[var(--color-ink-700)]"
          >
            {t("intro")}
          </Body>
        </div>

        <RevealStagger
          as="ul"
          className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <Reveal variant="slideUp">
                <SignatureCard product={product} locale={locale} />
              </Reveal>
            </li>
          ))}
        </RevealStagger>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

type CardProps = { product: DataProduct; locale: Locale };

function SignatureCard({ product, locale }: CardProps) {
  const primary = product.images[0];
  const formattedPrice = formatPrice(product.price, product.currency, locale);

  // Optional metadata caption: material · width-cm. We surface it only
  // when both fields are populated so a half-empty caption never ships.
  const widthCm = product.dimensions?.width;
  const metaParts: string[] = [];
  if (product.material) metaParts.push(product.material);
  if (typeof widthCm === "number") metaParts.push(`${widthCm}cm`);
  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : null;

  return (
    <Link
      href={`/${product.category}/${product.slug}`}
      // Sharp edges, no shadow rest, hairline border on hover only.
      className="group block min-w-0 rounded-none border border-transparent transition-colors duration-300 hover:border-[var(--color-bone-200)] focus-visible:outline-none focus-visible:border-[var(--color-terracotta-500)]"
      aria-label={product.name[locale]}
    >
      <article className="flex flex-col">
        {/* Image — bone-100 placeholder behind, 1px padding so the
            background peeks through and frames the photo subtly.
            The card's hover-only bone-200 border lives on the
            parent <Link>, so AspectFrame's resting-state hairline
            isn't the right primitive here — a plain aspect-locked
            div keeps the editorial "card" treatment intact. */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-bone-100)] p-px">
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt[locale]}
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              placeholder="blur"
              blurDataURL={BRAND_PORTRAIT_BLUR}
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.01]"
            />
          ) : null}
        </div>

        <div className="px-1 py-4">
          {/* Serif name — Display chains Latin → Georgian families. */}
          <h3 className="font-display text-base font-medium text-[var(--color-ink-900)] break-words">
            {product.name[locale]}
          </h3>
          <p className="mt-1 text-sm tabular-nums text-[var(--color-ink-500)]">
            {formattedPrice}
          </p>
          {metaLine ? (
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--color-ink-300)]">
              {metaLine}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
