// Grid wrapper around ProductCard. Two columns on phones, three on
// tablets, four on desktops.

import type { DataProduct } from "@/lib/data/types";
import { ProductCard } from "./product-card";

type Props = {
  products: DataProduct[];
};

export function ProductGrid({ products }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
