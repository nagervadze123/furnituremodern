// One product tile in the category grid. Server component.
//
// Clicking a card navigates to its detail page at
// /[locale]/[category]/[slug]. The id on the wrapper matches the
// product slug so the ItemList JSON-LD can deep-link to it as a hash.
//
// Phase 6 Slice 6 editorial port:
// - Image well moves from rounded `bg-muted` to `<AspectFrame ratio="4/5">`
//   so every card carries the same bone-200 hairline + bone-100 inner
//   surface as the rest of the editorial chrome.
// - "New" tag floats top-left when `isNewProduct(product)` returns true
//   (createdAt within 30 days). Painted via the editorial `Tag`
//   primitive at `variant="new"` (bone-50 on terracotta-600, AA-clear).
// - Product name moves to font-display ink-900; price reads
//   tabular-nums ink-500.

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { SelectItemLink } from "@/components/analytics/select-item-link";
import { AspectFrame, Tag, isNewProduct } from "@/components/design";
import { formatPrice } from "@/lib/format";
import { productToItem } from "@/lib/analytics";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import type { DataProduct } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

type Props = {
  product: DataProduct;
  /** Optional list_name passed to select_item analytics. */
  listName?: string;
  /**
   * Hint that this card is rendered above the fold so the image should
   * be preloaded as the LCP candidate. Set true ONLY for the first row
   * in a category grid (mobile shows 2 cards in row 1; desktop shows 4).
   * Default false — every other card lazy-loads.
   */
  priority?: boolean;
};

export async function ProductCard({ product, listName, priority = false }: Props) {
  const locale = (await getLocale()) as Locale;
  const tCard = await getTranslations("category.card");
  const primary = product.images[0];
  const item = productToItem(product, locale);
  const isNew = isNewProduct(product);

  const card = (
    <article
      // Anchor target for JSON-LD ItemList deep links.
      id={product.slug}
      // scroll-mt-20 keeps the sticky header from covering the anchor.
      // min-w-0 stops a long Georgian product name from blowing the
      // grid column out and forcing a horizontal scroll on the page.
      className="group min-w-0 scroll-mt-20"
    >
      {/* AspectFrame at 4/5 — every product photo ends up the same
          shape on the grid, regardless of source-file dimensions.
          The single biggest mobile-resilience guardrail on the
          catalogue. The "new" Tag floats top-left when applicable. */}
      <div className="relative">
        <AspectFrame ratio="4/5">
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt[locale]}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
              placeholder="blur"
              blurDataURL={BRAND_PORTRAIT_BLUR}
              priority={priority}
              // Hover scale is purely decorative. Limited to fine pointers
              // by `motion-safe:` so reduced-motion / touch-only users
              // don't see a sticky scaled state after a tap.
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
            />
          ) : null}
        </AspectFrame>
        {isNew ? (
          <Tag variant="new" className="absolute left-2 top-2">
            {tCard("new")}
          </Tag>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        {/* `text-balance` keeps wrapped names from leaving an orphan;
            `break-words` is the safety net for compound nouns. */}
        <h3 className="break-words text-balance font-display text-base font-medium text-[var(--color-ink-900)]">
          {product.name[locale]}
        </h3>
        <p className="mt-1 text-sm tabular-nums text-[var(--color-ink-500)]">
          {formatPrice(product.price, product.currency, locale)}
        </p>
      </div>
    </article>
  );

  // Wrap in a locale-aware link that also fires `select_item` on click.
  return (
    <SelectItemLink
      href={`/${product.category}/${product.slug}`}
      item={item}
      list_name={listName}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      ariaLabel={product.name[locale]}
    >
      {card}
    </SelectItemLink>
  );
}
