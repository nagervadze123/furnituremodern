// Desktop primary nav. Renders any `NavItem[]` (already-translated
// labels) supplied by the parent header, supporting one-level dropdowns
// when an item has `children`.
//
// Server component shell with per-item client `NavLink` islands so
// active-state highlighting works without re-rendering the whole
// header on every route change.
//
// Phase 6 Slice 2 — editorial typography. 12 px / 0.18 em tracking /
// 500 weight / uppercase. Resting colour ink-500 for inactive links,
// ink-900 for the active route. Top-level items are separated by 3 px
// ink-300 middle-dots so the nav reads as a single magazine masthead
// row instead of a Tailwind utility gap. Visual reference:
// `_design-reference/components/site-chrome.jsx:68-87`.

import { ChevronDown } from "lucide-react";
import { Fragment } from "react";

import { NavLink } from "./NavLink";
import { Link } from "@/i18n/navigation";
import type { NavItem } from "@/lib/navigation";

type Props = { items: NavItem[] };

export function DesktopNav({ items }: Props) {
  return (
    <nav
      // The wrapping <header> already provides the banner landmark; the
      // explicit `aria-label="Primary"` distinguishes this from the
      // footer landmarks ("Explore", "Customer", etc.).
      aria-label="Primary"
      className="hidden items-center md:flex"
    >
      {items.map((item, i) => (
        <Fragment key={item.href}>
          {i > 0 && (
            // Middle-dot separator between top-level items. ink-300
            // sits visually back from both inactive and active link
            // colours; aria-hidden so screen readers skip it.
            <span
              aria-hidden="true"
              className="mx-3.5 inline-block h-[3px] w-[3px] rounded-full bg-[var(--color-ink-300)] lg:mx-4"
            />
          )}
          <NavTopItem item={item} />
        </Fragment>
      ))}
    </nav>
  );
}

function NavTopItem({ item }: { item: NavItem }) {
  const hasChildren = !!item.children?.length;
  const baseLink =
    "relative inline-flex h-10 items-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)] focus-visible:outline-none focus-visible:text-[var(--color-ink-900)]";
  const activeUnderline =
    "text-[var(--color-ink-900)] after:absolute after:inset-x-0 after:-bottom-1 after:h-[1px] after:bg-[var(--color-ink-900)] after:content-['']";

  if (!hasChildren) {
    return (
      <NavLink
        href={item.href}
        className={baseLink}
        activeClassName={activeUnderline}
        exact={item.href === "/"}
      >
        {item.label}
      </NavLink>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={item.href}
        className={`${baseLink} gap-1`}
      >
        {item.label}
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
        />
      </Link>
      <ul
        className="invisible absolute left-1/2 top-full mt-2 min-w-44 -translate-x-1/2 rounded-lg border border-border/60 bg-popover p-1 opacity-0 shadow-lg ring-1 ring-foreground/5 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {item.children!.map((child) => (
          <li key={child.href}>
            <Link
              href={child.href}
              className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted"
            >
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
