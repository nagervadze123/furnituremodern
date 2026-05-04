// "Our categories" grid on the home page. Renders one CategoryCard
// per row in the data layer's category list.

import { getLocale, getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/data/categories";
import { CategoryCard } from "./category-card";
import type { Locale } from "@/i18n/routing";

// Phase 5 Task 4 — category-card hero images now reference curated
// stock photos in the Supabase Storage `product-images` bucket. When
// real photography lands, the right move is to add a `hero_storage_path`
// column to the `categories` table and read from there; until then
// this mapping keeps the home grid coherent with the product galleries.
const CATEGORY_STOCK_KEYS: Record<string, string> = {
  sofas: "stock/sofa-linen-cream-001.jpg",
  bedrooms: "stock/bed-platform-minimal-001.jpg",
  "tables-chairs": "stock/dining-oak-table-001.jpg",
};

function categoryImageUrl(slug: string): string {
  const key = CATEGORY_STOCK_KEYS[slug];
  if (!key) return "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/icon.svg";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${key}`;
}

export async function FeaturedCategories() {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;
  const categories = await getCategories(locale);

  return (
    <section
      // id is the anchor target the hero "secondary" CTA scrolls to.
      id="categories"
      // Always include scroll-margin so anchor jumps clear the sticky header.
      className="scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight break-words text-foreground sm:text-3xl md:text-4xl">
            {t("categoriesTitle")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            {t("categoriesSubtitle")}
          </p>
        </div>
        {/* gap-4 on phones, gap-5 sm+, gap-6 lg — keeps cards roomy on
            desktop without crowding portrait phone screens. */}
        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.slug}
              href={`/${cat.slug}`}
              name={cat.name[locale]}
              tagline={cat.description[locale]}
              imageUrl={categoryImageUrl(cat.slug)}
              imageAlt={cat.name[locale]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
