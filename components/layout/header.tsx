// Sticky top header: brand wordmark on the left, primary nav in the
// middle, locale switcher + mobile menu trigger on the right.
//
// Server component. The two interactive children (LocaleSwitcher,
// MobileNav) are themselves client components.
//
// Phase 5 Task 3: nav items come from `categories.is_featured_in_nav`
// in Supabase, capped at 5 by the data-layer helper. Adding a 6th
// category to the menu is now an admin toggle, not a code change.

import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { siteConfig } from "@/lib/site-config";
import { getFeaturedNavCategories } from "@/lib/data/categories";
import type { NavItem } from "@/lib/navigation";
import type { Locale } from "@/i18n/routing";

export async function Header() {
  const t = await getTranslations("nav");
  const tSite = await getTranslations("site");
  const locale = (await getLocale()) as Locale;
  const navCats = await getFeaturedNavCategories(locale);

  // Single source of nav items: a static "Home" entry, then the
  // operator's flagged categories in display order. DesktopNav and
  // MobileNav both consume this list as already-translated strings.
  const items: NavItem[] = [
    { label: t("home"), href: "/" },
    ...navCats.map((c) => ({
      label: c.name[locale],
      href: `/${c.slug}`,
    })),
  ];

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

      {/* `pt-safe` lifts the sticky header below the iOS notch / status
          bar when the page is opened with `viewport-fit=cover`. Inner
          row keeps fixed 64px so the visual rhythm doesn't shift. */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:gap-4 md:px-6">
          {/* Logo is a separate clickable link to home, deliberately
              kept alongside the explicit "Home" nav item per the spec.
              `min-w-0` + truncate keeps a longer brand name from
              pushing the locale switcher off-screen on narrow phones. */}
          <Link
            href="/"
            className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            aria-label={`${siteConfig.name} — ${t("home")}`}
          >
            {siteConfig.name}
          </Link>

          <DesktopNav items={items} />

          <div className="flex shrink-0 items-center gap-1">
            <LocaleSwitcher />
            <MobileNav items={items} openMenuLabel={t("openMenu")} />
          </div>
        </div>
      </header>
    </>
  );
}
