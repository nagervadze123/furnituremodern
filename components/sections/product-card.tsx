// One product tile in the category grid. Server component.
//
// Clicking a card navigates to its detail page at
// /[locale]/[category]/[slug]. The id on the wrapper matches the
// product slug so the ItemList JSON-LD can deep-link to it as a hash.

import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { DataProduct } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

type Props = {
  product: DataProduct;
};

export async function ProductCard({ product }: Props) {
  const locale = (await getLocale()) as Locale;
  const primary = product.images[0];

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

  // Wrap in a locale-aware link to the product detail page.
  return (
    <Link
      href={`/${product.category}/${product.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      aria-label={product.name[locale]}
    >
      {card}
    </Link>
  );
}
