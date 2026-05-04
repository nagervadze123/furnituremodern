// Mobile drawer navigation — Phase 5 Task 5.7 redesign.
//
// Custom drawer (not the shadcn/base-ui Sheet) because we want:
//   • CSS-only transform animation (translateX) — no framer-motion in
//     the bundle, no JS-driven keyframes, prefers-reduced-motion
//     respected via the global rule that flattens transition-duration
//     to ~0s.
//   • Manual focus trap + restore-on-close — the chunk of code is
//     small enough that pulling in another dependency isn't worth it.
//   • Backdrop blur overlay with click-to-close.
//   • ESC closes; the trigger button receives focus back.
//   • Active state on links matches the desktop nav.
//
// Architecture: a single client component that owns the open state.
// Renders the trigger inline (in the header row) and the drawer +
// backdrop conditionally — but always keeps them mounted so the
// transition can animate in and out (CSS transition cancels otherwise).

"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X, MapPin, Phone, Mail, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLink } from "./NavLink";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

type Props = {
  items: NavItem[];
};

const FOCUSABLE_SELECTOR = [
  "a[href]:not([disabled])",
  "button:not([disabled])",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function MobileNav({ items }: Props) {
  const [open, setOpen] = useState(false);
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");

  const openMenuLabel = tNav("openMenu");
  const closeMenuLabel = tNav("closeMenu");
  const drawerLabel = tNav("drawerLabel");
  const menuTitleLabel = tNav("menuTitle");
  const footerHoursLabel = tFooter("hours_label");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Open: lock body scroll, focus the close button, attach key listener.
  // Close: restore body scroll, return focus to the trigger.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    // Snapshot the trigger ref now so the cleanup closure isn't reading
    // a (possibly stale) `.current` reference at unmount time.
    const triggerNode = triggerRef.current;
    document.body.style.overflow = "hidden";

    // Focus the close button after the panel transitions in.
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap.
      const panel = drawerRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to whatever opened us (typically the trigger).
      // Falling back to the previously-focused element keeps the
      // keyboard contract intact even if focus jumped elsewhere
      // mid-flow.
      const target =
        triggerNode && document.contains(triggerNode)
          ? triggerNode
          : previouslyFocused;
      target?.focus?.();
    };
  }, [open]);

  // Format opening hours into a short, locale-agnostic readout for the
  // contact panel. Uses siteConfig directly so the text matches the
  // footer column.
  const openingRows = siteConfig.contact.openingHours.map((row) => ({
    days: row.days.join(", "),
    range: `${row.opens} – ${row.closes}`,
  }));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? closeMenuLabel : openMenuLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
        className="touch-target inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      {/* Backdrop. Always mounted, opacity toggled. pointer-events-none
          when closed so the page is interactive. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        data-state={open ? "open" : "closed"}
        className={cn(
          "fixed inset-0 z-40 bg-background/40 backdrop-blur-sm transition-opacity duration-200",
          "data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0",
          "data-[state=open]:pointer-events-auto data-[state=open]:opacity-100",
          "md:hidden"
        )}
      />

      {/* Drawer panel. role=dialog + aria-modal=true announces it as a
          modal to AT. Translate is animated on close so the panel
          slides off-screen instead of popping. */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={drawerLabel}
        data-state={open ? "open" : "closed"}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(20rem,90vw)] flex-col overflow-y-auto pb-safe",
          "border-l border-border/60 bg-background shadow-xl",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          "data-[state=closed]:translate-x-full data-[state=closed]:invisible data-[state=closed]:pointer-events-none",
          "data-[state=open]:translate-x-0 data-[state=open]:visible",
          "md:hidden"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-4 pt-safe-4">
          <p className="font-display text-base font-semibold tracking-tight text-foreground">
            {menuTitleLabel}
          </p>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label={closeMenuLabel}
            onClick={() => setOpen(false)}
            className="touch-target inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <nav
          aria-label={drawerLabel}
          className="flex flex-1 flex-col gap-1 px-4 py-4"
        >
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              exact={item.href === "/"}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeClassName="bg-muted text-foreground"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-border/60 px-4 py-4">
          <LanguageSwitcher variant="drawer" className="mb-4" />

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
              />
              <span className="break-words">
                {siteConfig.contact.address.street},{" "}
                {siteConfig.contact.address.city}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Phone
                aria-hidden="true"
                className="mt-3 h-4 w-4 shrink-0 text-foreground/60"
              />
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="-mx-1 inline-flex min-h-11 items-center break-words rounded px-1 text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {siteConfig.contact.phone}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail
                aria-hidden="true"
                className="mt-3 h-4 w-4 shrink-0 text-foreground/60"
              />
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="-mx-1 inline-flex min-h-11 items-center break-all rounded px-1 text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {siteConfig.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Clock
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/70">
                  {footerHoursLabel}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {openingRows.map((row) => (
                    <li key={row.days} className="break-words">
                      <span className="text-foreground/70">{row.days}:</span>{" "}
                      <span>{row.range}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
