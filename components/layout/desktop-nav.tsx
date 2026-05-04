// Desktop primary nav. Renders any `NavItem[]` (already-translated
// labels) supplied by the parent header, supporting one-level dropdowns
// when an item has `children`.
//
// Server component shell with per-item client `NavLink` islands so
// active-state highlighting (accent underline on the current category)
// works without re-rendering the whole header on every route change.

import { ChevronDown } from "lucide-react";

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
      className="hidden items-center gap-6 md:flex lg:gap-8"
    >
      {items.map((item) => (
        <NavTopItem key={item.href} item={item} />
      ))}
    </nav>
  );
}

function NavTopItem({ item }: { item: NavItem }) {
  const hasChildren = !!item.children?.length;
  const baseLink =
    "relative inline-flex h-10 items-center text-sm font-medium tracking-tight text-foreground/70 transition-colors hover:text-foreground";
  const activeUnderline =
    "after:absolute after:inset-x-0 after:-bottom-1 after:h-[2px] after:bg-accent after:content-[''] text-foreground";

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
