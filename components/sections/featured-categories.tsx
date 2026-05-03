// "Our categories" grid on the home page. Renders one CategoryCard
// per row in the data layer's category list.

import { getLocale, getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/data/categories";
import { CategoryCard } from "./category-card";
import type { Locale } from "@/i18n/routing";

// Stable picsum seeds keep each category's hero image identifiable.
// When real photography lands, replace this map with a column on the
// `categories` table.
const categoryImages: Record<string, string> = {
  sofas: "https://picsum.photos/seed/fm-cat-sofas/900/1100",
  bedrooms: "https://picsum.photos/seed/fm-cat-bedrooms/900/1100",
  "tables-chairs": "https://picsum.photos/seed/fm-cat-tables/900/1100",
};

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
              imageUrl={categoryImages[cat.slug] ?? ""}
              imageAlt={cat.name[locale]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
