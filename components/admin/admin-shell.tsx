// Admin chrome: sidebar nav + topbar + main content area.
// Used by every admin page EXCEPT /admin/login (which renders bare).

import Link from "next/link";
import {
  LayoutDashboard,
  Box,
  FolderTree,
  ArrowRightLeft,
  Search,
} from "lucide-react";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", Icon: Box },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
  { href: "/admin/redirects", label: "Redirects", Icon: ArrowRightLeft },
  { href: "/admin/seo", label: "SEO Audit", Icon: Search },
] as const;

type Props = {
  children: React.ReactNode;
  // Optional admin context the parent can pass in (email, role, etc.)
  // for display in the sidebar.
  email?: string | null;
};

export function AdminShell({ children, email }: Props) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            Admin
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          {email ? (
            <p className="px-3 pb-2 text-xs text-muted-foreground" title={email}>
              {email}
            </p>
          ) : null}
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 md:hidden">
          <Link href="/admin" className="text-lg font-semibold">
            Admin
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View site
          </Link>
        </header>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
