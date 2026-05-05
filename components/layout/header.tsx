// Sticky top header — Phase 5 Task 5.7 redesign.
//
// At a glance:
//   • Brand monogram + name on the left (links to /[locale]).
//   • Primary nav (categories + Home, max 5 items) centred / right.
//   • Language switcher + mobile drawer trigger on the far right.
//   • Sticky with a scroll-aware shrink: tall and transparent at top,
//     tighter and frosted-glass once the user scrolls past 80px.
//
// Architecture:
//   • Outer <header> is a server component that emits the static
//     markup.
//   • A tiny client island <HeaderScrollEffect /> attaches a single
//     rAF-throttled scroll listener and toggles `data-scrolled` on the
//     header element. CSS does the rest — no React re-render on scroll.
//   • Active-state highlighting on nav links uses a per-link client
//     <NavLink> island that calls usePathname(). DesktopNav stays a
//     server component so its structure ships as static HTML.
//
// Hero overlap:
//   • `data-site-header` carries `--site-header-height-{open,scrolled}`
//     CSS variables so the home Hero (and any other full-bleed page)
//     can pull itself up under the header without hardcoding pixel
//     values. Today the home Hero hardcodes `-mt-20`; either approach
//     works because the header keeps its open height pinned at 5rem.
//
// Accessibility:
//   • `<header>` provides the banner landmark.
//   • `<nav aria-label="Primary">` for the main nav.
//   • `<a href="#main-content">` skip-link is the very first focusable
//     element and only visible when focused — meets WCAG 2.4.1.
//   • Language switcher and drawer trigger have ≥44×44px touch targets.

import { getLocale, getTranslations } from "next-intl/server";

import { BrandMark } from "./BrandMark";
import { DesktopNav } from "./desktop-nav";
import { HeaderScrollEffect } from "./HeaderScrollEffect";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site-config";
import { getFeaturedNavCategories } from "@/lib/data/categories";
import type { NavItem } from "@/lib/navigation";
import type { Locale } from "@/i18n/routing";

export async function Header() {
  const t = await getTranslations("nav");
  const tSite = await getTranslations("site");
  const locale = (await getLocale()) as Locale;
  const navCats = await getFeaturedNavCategories(locale);

  // Home + featured categories. The data layer caps the categories at
  // 5; the +1 Home entry brings the visual maximum to 6, which still
  // fits comfortably on a 1024px viewport with our 1.5rem gap.
  const items: NavItem[] = [
    { label: t("home"), href: "/" },
    ...navCats.map((c) => ({
      label: c.name[locale],
      href: `/${c.slug}`,
    })),
  ];

  return (
    <>
      {/* Skip link — first focusable element on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        {tSite("skipToContent")}
      </a>

      <header
        // `data-site-header` is the hook the scroll-effect island
        // queries. `data-scrolled="false"` is the initial state; the
        // effect flips it to "true" once scrollY > 80.
        data-site-header
        data-scrolled="false"
        // pt-safe lifts the sticky header below the iOS notch.
        // motion-reduce kills the padding/background transitions for
        // users with `prefers-reduced-motion: reduce` — they get the
        // discrete state change without any animation.
        className="
          group/header sticky top-0 z-40 pt-safe
          transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200 ease-out
          motion-reduce:transition-none
          data-[scrolled=false]:bg-background/0 data-[scrolled=false]:border-b data-[scrolled=false]:border-transparent
          data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur supports-[backdrop-filter]:data-[scrolled=true]:bg-background/70
          data-[scrolled=true]:border-b data-[scrolled=true]:border-border/60 data-[scrolled=true]:shadow-sm
        "
      >
        <div
          className="
            mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6
            transition-[padding,height] duration-200 ease-out motion-reduce:transition-none
            group-data-[scrolled=false]/header:py-5 group-data-[scrolled=true]/header:py-2.5
          "
        >
          <Link
            href="/"
            className="inline-flex min-w-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${siteConfig.name} — ${t("home")}`}
          >
            <BrandMark />
          </Link>

          <DesktopNav items={items} />

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            {/* Phase 6 Slice 2 — editorial Visit CTA painted via the
                shadcn `buttonVariants` CVA's new `editorialGhost`
                variant. The base-ui Button doesn't accept `asChild`
                (and an `<a>` inside `<button>` is invalid HTML), so
                we apply the variant classes directly to a Link —
                mirroring the existing pattern at
                `app/[locale]/error.tsx:103-112`. Routes to
                `/[locale]/#visit` from any page so non-home routes
                still scroll-jump to the visit section after a
                navigation. Hidden on `<lg` to avoid crowding the
                mobile drawer trigger. */}
            <Link
              href="/#visit"
              className={buttonVariants({
                variant: "editorialGhost",
                size: "editorialCompact",
                className: "hidden lg:inline-flex",
              })}
            >
              {t("visit")}
            </Link>
            <MobileNav items={items} />
          </div>
        </div>
      </header>

      {/* Scroll-state controller. Renders nothing. */}
      <HeaderScrollEffect />
    </>
  );
}
