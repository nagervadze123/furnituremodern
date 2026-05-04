// Premium product grid for the category landing — Phase 5 Task 5 follow-up.
//
// Improvements over components/sections/product-grid.tsx:
//   • Responsive grid: 4 cols desktop / 3 tablet / 2 mobile (per the
//     redesign brief). The legacy grid topped out at 4 only at lg.
//   • Reveal stagger on scroll into view — each card slides up with a
//     short cascade. Reduced-motion users see static cards.
//   • Subtle hover lift — translate-y -2px and shadow upgrade — handled
//     entirely on the existing ProductCard via group-hover.
//   • Empty state — when a category has no products, render a localized
//     "no products yet" message with a link to the category index.

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container, Section } from "@/components/design";
import { Reveal } from "@/lib/motion";
import { ProductCard } from "@/components/sections/product-card";
import type { DataProduct } from "@/lib/data/types";

type Props = {
  products: DataProduct[];
  /** Optional list_name passed through to product-card analytics. */
  listName?: string;
};

export async function ProductGrid({ products, listName }: Props) {
  const t = await getTranslations("category");

  if (products.length === 0) {
    return (
      <Section variant="default">
        <Container variant="default">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
            <p className="text-balance text-base text-muted-foreground md:text-lg">
              {t("no_products")}
            </p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("browse_other_categories")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section variant="default" aria-label={listName ?? t("browseOther")}>
      <Container variant="wide">
        {/*
          Mobile-first columns:
            • mobile  → 2 columns (per brief; cards still readable at 360px)
            • md      → 3 columns
            • lg      → 4 columns
          Smaller gap on phones keeps each card usable; larger gap at lg+
          gives the grid editorial breathing room.
        */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4 lg:gap-x-8">
          {products.map((product, index) => (
            <li key={product.id} className="min-w-0">
              {/*
                Stagger the cards in batches so the cascade feels
                editorial without dragging on. Threshold matches Reveal
                default; per-card delay scales with grid position so the
                first row enters first, second row a beat later.
              */}
              <Reveal
                variant="slideUp"
                threshold={0.15}
                style={{
                  transitionDelay: `${Math.min(index, 7) * 60}ms`,
                }}
              >
                {/*
                  group/card lets the card scope its hover lift so the
                  shadow + translate land together without leaking into
                  unrelated children.
                */}
                <div className="group/card motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-0.5">
                  <ProductCard product={product} listName={listName} />
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
