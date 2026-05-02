// /admin — dashboard. Shows row counts so the admin can confirm at a
// glance that the database is connected and populated.

import Link from "next/link";
import { Box, FolderTree, ArrowRightLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RumTile } from "@/components/admin/rum-tile";
import type { Database } from "@/lib/supabase/database.types";

// Restrict the table arg to known table names so the typed Supabase
// client can route .from() to the right Insert/Update/Row shape.
type CountableTable = keyof Database["public"]["Tables"];

async function getCount(table: CountableTable): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const [products, categories, redirects] = await Promise.all([
    getCount("products"),
    getCount("categories"),
    getCount("redirects"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of the live catalog.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <DashboardCard
          href="/admin/products"
          label="Products"
          count={products}
          Icon={Box}
        />
        <DashboardCard
          href="/admin/categories"
          label="Categories"
          count={categories}
          Icon={FolderTree}
        />
        <DashboardCard
          href="/admin/redirects"
          label="Redirects"
          count={redirects}
          Icon={ArrowRightLeft}
        />
      </div>

      <div className="mt-8">
        <RumTile />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  label,
  count,
  Icon,
}: {
  href: string;
  label: string;
  count: number | null;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-background p-6 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <Icon aria-hidden className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {count ?? "—"}
      </p>
    </Link>
  );
}
