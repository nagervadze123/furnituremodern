// Renders when notFound() is called inside a [locale] route — usually
// because the URL contains an unsupported locale or a missing product.
// Fires a /api/log-404 beacon (Plan 2 Task 8) so the SEO dashboard can
// surface the most-hit missing paths.

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Log404Beacon } from "@/components/log-404-beacon";

export default async function NotFound() {
  const t = await getTranslations("breadcrumbs");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center md:px-6">
      <Log404Beacon />
      <p className="font-display text-7xl font-semibold text-foreground">404</p>
      <p className="mt-4 text-lg text-muted-foreground">
        We could not find that page.
      </p>
      <Link href="/" className={`${buttonVariants({ size: "lg" })} mt-8`}>
        {t("home")}
      </Link>
    </div>
  );
}
