// Language switcher in the header. Client component because it needs
// usePathname() to keep the user on the same page after switching.

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const labels: Record<Locale, string> = {
  ka: "ქართული",
  en: "English",
};

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale() as Locale;
  const [, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === activeLocale) return;
    // router.replace from i18n/navigation handles the locale prefix for us.
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      {/* base-ui (the primitive shadcn used here) uses `render` instead
          of `asChild` to customize the trigger element. We pass a Button
          via the `render` prop and base-ui merges its data attributes. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("switchLanguage")}
            className="gap-2"
          >
            <Globe aria-hidden="true" className="h-4 w-4" />
            <span className="text-sm font-medium uppercase">
              {activeLocale}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-32">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchTo(loc)}
            aria-current={loc === activeLocale ? "true" : undefined}
            className={loc === activeLocale ? "font-medium" : undefined}
          >
            {labels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
