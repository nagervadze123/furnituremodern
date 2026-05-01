// Internal-link block at the bottom of every category page.
// Renders links to all OTHER categories so visitors and crawlers can
// follow the site graph without going back to the home page.

import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { CategorySlug } from "@/lib/site-config";
import { getCategories } from "@/lib/data/categories";
import type { Locale } from "@/i18n/routing";

type Props = {
  // The category we're currently on, so we can exclude it from the list.
  currentSlug: CategorySlug;
};

export async function CategoryCrossLinks({ currentSlug }: Props) {
  const t = await getTranslations("category");
  const locale = (await getLocale()) as Locale;
  const all = await getCategories(locale);
  const others = all.filter((c) => c.slug !== currentSlug);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {t("browseOther")}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {others.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="group flex items-center justify-between gap-6 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/50"
          >
            <div>
              <p className="font-display text-lg font-medium text-foreground">
                {c.name[locale]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.description[locale]}
              </p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
