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
          element instead of the default <button>. */}
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("openMenu")}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{t("openMenu")}</SheetTitle>
        </SheetHeader>
        <nav
          aria-label={t("openMenu")}
          className="mt-6 flex flex-col gap-1 px-4"
        >
          {items.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                // Closing the sheet on click feels native and avoids
                // the user navigating with a stale open drawer.
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted"
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
                        className="block rounded-md px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted"
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
