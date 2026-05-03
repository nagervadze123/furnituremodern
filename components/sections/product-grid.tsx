// Grid wrapper around ProductCard. Two columns on phones, three on
// tablets, four on desktops.

import type { DataProduct } from "@/lib/data/types";
import { ProductCard } from "./product-card";

type Props = {
  products: DataProduct[];
  /** Optional list_name passed through to product-card analytics. */
  listName?: string;
};

export function ProductGrid({ products, listName }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
      {/*
        Mobile-first columns:
        - 1 column at < 360px (single product per row, photo is large)
        - 2 columns at sm (≥640px) — phones in landscape, small tablets
        - 3 at md, 4 at lg (desktop)
        Smaller gap on phones keeps each card wider; larger gap at md+
        gives the grid breathing room.
      */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} listName={listName} />
          </li>
        ))}
      </ul>
    </section>
  );
}
