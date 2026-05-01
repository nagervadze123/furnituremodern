// Desktop primary nav. Renders any `NavItem[]` from `lib/navigation.ts`,
// supporting one-level dropdowns when an item has `children`.
//
// Server component. Dropdown items still work without JS — they fall
// back to displaying their label as plain text — but become an
// accessible disclosure on hover/focus via CSS group-hover.

import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NavItem, NavLabelKey } from "@/lib/navigation";

type Props = { items: NavItem[] };

export async function DesktopNav({ items }: Props) {
  const t = await getTranslations("nav");

  return (
    <nav
      // aria-label uses a generic "main navigation" since the nav covers
      // the whole site, not a specific section.
      aria-label="Main navigation"
      className="hidden items-center gap-8 md:flex"
    >
      {items.map((item) => (
        <NavTopItem key={item.href} item={item} translate={(k) => t(k)} />
      ))}
    </nav>
  );
}

function NavTopItem({
  item,
  translate,
}: {
  item: NavItem;
  translate: (key: NavLabelKey) => string;
}) {
  const label = translate(item.labelKey);
  const hasChildren = !!item.children?.length;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
      >
        {label}
      </Link>
    );
  }

  // One-level dropdown. Pure CSS hover/focus disclosure — no JS needed.
  // The chevron rotates to signal open state.
  return (
    <div className="group relative">
      <Link
        href={item.href}
        className="flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
        />
      </Link>
      <ul
        // The dropdown is hidden by default and revealed when its parent
        // is hovered or any descendant is focused.
        className="invisible absolute left-1/2 top-full mt-2 min-w-44 -translate-x-1/2 rounded-lg border border-border/60 bg-popover p-1 opacity-0 shadow-lg ring-1 ring-foreground/5 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {item.children!.map((child) => (
          <li key={child.href}>
            <Link
              href={child.href}
              className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted"
            >
              {translate(child.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
