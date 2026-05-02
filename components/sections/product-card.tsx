// One product tile in the category grid. Server component.
//
// Clicking a card navigates to its detail page at
// /[locale]/[category]/[slug]. The id on the wrapper matches the
// product slug so the ItemList JSON-LD can deep-link to it as a hash.

import Image from "next/image";
import { getLocale } from "next-intl/server";
import { SelectItemLink } from "@/components/analytics/select-item-link";
import { formatPrice } from "@/lib/format";
import { productToItem } from "@/lib/analytics";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import type { DataProduct } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

type Props = {
  product: DataProduct;
  /** Optional list_name passed to select_item analytics. */
  listName?: string;
};

export async function ProductCard({ product, listName }: Props) {
  const locale = (await getLocale()) as Locale;
  const primary = product.images[0];
  const item = productToItem(product, locale);

  const card = (
    <article
      // Anchor target for JSON-LD ItemList deep links.
      id={product.slug}
      // scroll-mt-20 keeps the sticky header from covering the anchor.
      className="group scroll-mt-20"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt[locale]}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            placeholder="blur"
            blurDataURL={BRAND_PORTRAIT_BLUR}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="mt-4">
        <h3 className="font-display text-base font-medium text-foreground">
          {product.name[locale]}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
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
