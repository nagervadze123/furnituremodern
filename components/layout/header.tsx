// Sticky top header: brand wordmark on the left, primary nav in the
// middle, locale switcher + mobile menu trigger on the right.
//
// Server component. The two interactive children (LocaleSwitcher,
// MobileNav) are themselves client components.
//
// Nav items come from `lib/navigation.ts` so adding a 5th item or a
// dropdown is a one-file change.

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { siteConfig } from "@/lib/site-config";
import { mainNav } from "@/lib/navigation";

export async function Header() {
  const t = await getTranslations("nav");
  const tSite = await getTranslations("site");

  return (
    <>
      {/* Skip link: shown only when keyboard-focused. Lets screen-reader
          and keyboard users jump straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        {tSite("skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          {/* Logo is a separate clickable link to home, deliberately
              kept alongside the explicit "Home" nav item per the spec. */}
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
            aria-label={`${siteConfig.name} — ${t("home")}`}
          >
            {siteConfig.name}
          </Link>

          <DesktopNav items={mainNav} />

          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <MobileNav items={mainNav} />
          </div>
        </div>
      </header>
    </>
  );
}
