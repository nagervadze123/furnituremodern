// Active-aware navigation link. Wraps the locale-aware <Link> from
// i18n/navigation and adds an accent underline when the user is on the
// matching route.
//
// Why a separate client component: usePathname() needs to run on the
// client. DesktopNav itself stays a server component so its structure
// can be rendered without shipping JS — only the per-item active check
// hydrates.

"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Class added when this link's `href` matches the current path. */
  activeClassName?: string;
  /** When true, the link is "active" only on an exact match.
      When false (default), a prefix match also counts — clicking
      "Sofas" should keep the active state on `/sofas/some-product`. */
  exact?: boolean;
  onClick?: () => void;
};

export function NavLink({
  href,
  children,
  className,
  activeClassName,
  exact = false,
  onClick,
}: Props) {
  const pathname = usePathname();

  // pathname from i18n/navigation is already locale-stripped, so we
  // compare against the bare href.
  const normalized = pathname.replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  const isActive = exact
    ? normalized === target
    : target === "/"
    ? normalized === "/"
    : normalized === target || normalized.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
}
