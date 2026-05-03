// Mobile drawer for the admin shell. Same pattern as the public
// MobileNav: a Sheet trigger button (hamburger) and a list of links.
// Closes itself on click so the admin doesn't navigate with a stale
// drawer open. Desktop renders the persistent left sidebar instead;
// this component is rendered conditionally inside `AdminShell` and
// hidden via Tailwind's `md:hidden` from the parent.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignOutButton } from "./sign-out-button";
import type { AdminNavItem } from "./admin-shell";

type Props = {
  items: AdminNavItem[];
  email: string | null;
};

export function AdminMobileNav({ items, email }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="touch-target -ml-2"
            aria-label="Open admin menu"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="flex w-[min(20rem,90vw)] flex-col gap-0 overflow-y-auto pb-safe"
      >
        <SheetHeader>
          <SheetTitle>Admin</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Admin sections"
          className="mt-4 flex min-w-0 flex-1 flex-col gap-1 px-4 pb-4"
        >
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                // min-h-11 enforces a 44px tap row even at the smallest
                // text size; `aria-current="page"` styles the active
                // section without an extra class hierarchy.
                className={
                  "flex min-h-11 items-center rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:text-foreground" +
                  (isActive ? " text-foreground" : " text-foreground/80")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          {email ? (
            <p
              className="mb-2 text-xs break-all text-muted-foreground"
              title={email}
            >
              {email}
            </p>
          ) : null}
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
