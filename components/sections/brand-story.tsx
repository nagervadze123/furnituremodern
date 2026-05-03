// Short brand-story block on the home page. Pure server component.

import { getTranslations } from "next-intl/server";

export async function BrandStory() {
  const t = await getTranslations("home");

  return (
    <section className="border-y border-border/40 bg-muted/40 px-4 py-12 sm:py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance font-display text-2xl font-semibold tracking-tight break-words text-foreground sm:text-3xl md:text-4xl">
          {t("storyTitle")}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("storyBody")}
        </p>
      </div>
    </section>
  );
}
