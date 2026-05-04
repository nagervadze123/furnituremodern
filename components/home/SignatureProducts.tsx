// Home "signature products" strip. Phase 5 Task 5.
//
// Shows the eight most-recent published products in a layout that
// changes shape across breakpoints:
//   • Mobile: horizontal snap-scroll carousel — each card is ~75vw
//     wide so the next card is always slightly visible (cue to swipe).
//   • Tablet: 2-column grid.
//   • Desktop (lg+): 4-column grid.
//
// Uses the existing ProductCard so analytics, alt-text, and link
// behavior stay consistent with the catalogue grid.
//
// SEO: emits an ItemList JSON-LD so Google can surface the carousel
// as a rich result. The schema id is anchored to the home URL with
// `#signature-products` to distinguish it from category-page lists.

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Body,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { ProductCard } from "@/components/sections/product-card";
import { JsonLd } from "@/components/json-ld";
import { Reveal, RevealStagger } from "@/lib/motion";
import { getProducts } from "@/lib/data/products";
import { homeSignatureItemListJsonLd } from "@/lib/schema";
import type { Locale } from "@/i18n/routing";

const SIGNATURE_LIMIT = 8;

export async function SignatureProducts() {
  const t = await getTranslations("home.signature_products");
  const locale = (await getLocale()) as Locale;

  // Pull the most-recent products. The data layer orders by sort_order
  // ascending; that's stable for now and matches the catalogue's own
  // grid ordering. When operator marks "featured" rows in admin, the
  // home strip can switch to featuredOnly: true with no other change.
  const products = await getProducts({ limit: SIGNATURE_LIMIT, locale });
  if (products.length === 0) return null;

  // Per-request CSP nonce so the inline <script type="application/ld+json">
  // is allowed by the strict CSP. The home page already threads the
  // same nonce into its layout-level JSON-LD blocks; matching it here
  // keeps the contract consistent.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <Section
      id="signature"
      aria-labelledby="signature-products-heading"
      // surface-100 is one shade up from the page background — gives
      // this section a soft "paper" panel feel without breaking the
      // editorial whitespace rhythm.
      className="bg-[var(--color-surface-100,oklch(0.98_0.006_78))] scroll-mt-20"
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
        <RevealStagger as="div" className="mb-10 flex flex-col gap-3 md:mb-14">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Heading
            id="signature-products-heading"
            variant={1}
            as="h2"
            className="max-w-2xl"
          >
            {t("heading")}
          </Heading>
          <Body variant="lg" className="max-w-2xl">
            {t("intro")}
          </Body>
        </RevealStagger>

        {/*
          Layout switches via container classes:
            • mobile  → flex row + overflow-x snap-scroll. Each child is
                        sized via the flex-basis trick (basis-[75vw]).
            • sm      → 2-col grid.
            • lg      → 4-col grid.

          We render ONE list with classes that swap behavior, rather
          than rendering twice with hidden/visible toggles, so the DOM
          stays minimal and analytics fire once per click.
        */}
        <ul
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:pb-0 lg:grid-cols-4"
          // hide the scrollbar on mobile (purely cosmetic — the
          // overflow is still scrollable). overscroll-contain stops a
          // horizontal swipe from also scrolling the page.
          style={{ scrollbarWidth: "none", overscrollBehaviorX: "contain" }}
          aria-label={t("heading")}
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="min-w-[75vw] shrink-0 snap-start sm:min-w-0 sm:shrink"
            >
              <Reveal variant="slideUp">
                <ProductCard product={product} listName="home_signature" />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
