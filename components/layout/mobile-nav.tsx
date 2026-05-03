// Mobile drawer nav. Client component because it controls open/close
// state. Renders any `NavItem[]` from `lib/navigation.ts`, supporting
// one-level nested groups (rendered as indented sub-lists).

"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavItem } from "@/lib/navigation";

type Props = { items: NavItem[] };

export function MobileNav({ items }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* base-ui SheetTrigger uses `render` to mount a custom trigger
          element instead of the default <button>. The `touch-target`
          utility forces the natural 32px icon button up to ≥44×44 so
          the tap zone meets WCAG 2.5.5 even though the visible chrome
          stays compact. base-ui Dialog (under SheetContent) handles
          body-scroll-lock + focus trap + Escape close natively. */}
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="touch-target md:hidden"
            aria-label={t("openMenu")}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>
        }
      />
      {/*
        w-[min(20rem,90vw)] keeps the drawer narrow enough to feel like
        a sheet on a 360px phone while still giving us 320px on larger
        phones/tablets. `pb-safe` keeps the last nav item above the
        iOS home-indicator. overflow-y-auto lets long nav lists scroll
        when content exceeds dvh — the parent body is scroll-locked, so
        only the drawer scrolls.
      */}
      <SheetContent
        side="right"
        className="flex w-[min(20rem,90vw)] flex-col gap-0 overflow-y-auto pb-safe"
      >
        <SheetHeader>
          <SheetTitle>{t("openMenu")}</SheetTitle>
        </SheetHeader>
        <nav
          aria-label={t("openMenu")}
          className="mt-4 flex min-w-0 flex-col gap-1 px-4 pb-6"
        >
          {items.map((item) => (
            <div key={item.href} className="min-w-0">
              <Link
                href={item.href}
                // Closing the sheet on click feels native and avoids
                // the user navigating with a stale open drawer.
                onClick={() => setOpen(false)}
                // min-h-11 enforces a 44px tap row for finger-sized
                // touch targets; flex+items-center keeps the label
                // vertically centered when names wrap to two lines.
                className="flex min-h-11 items-center rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t(item.labelKey)}
              </Link>
              {/* One-level deep nested items render as an indented list. */}
              {item.children?.length ? (
                <ul className="ml-3 mt-1 border-l border-border/60 pl-3">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted"
                      >
                        {t(child.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
