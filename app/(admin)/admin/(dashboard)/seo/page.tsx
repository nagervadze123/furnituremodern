// /admin/seo — SEO audit dashboard.
//
// Built up across Plan 2 Tasks 10-13:
//   • Task 10: summary cards
//   • Task 11: redirects table with delete
//   • Task 12: top 404 paths with quick-redirect form
//   • Task 13: orphan slug-history entries with cleanup
//
// All queries run via the service-role admin client. The page is
// force-dynamic because the counts and tables are stale within a
// minute and there's no value in caching them.

import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 86_400_000;

export default async function SeoAuditPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  // Server-side wall-clock filter; the purity rule flags Date.now() but
  // Server Components legitimately need it for time-windowed queries.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const [
    redirectsCount,
    historyCount,
    notFoundCount,
    missingDescriptionsCount,
  ] = await Promise.all([
    supabase
      .from("redirects")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("product_slug_history")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("not_found_log")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", since),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_published", true)
      .or("description_ka.eq.,description_en.eq."),
  ]);

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Counters are live; tables update on each page load.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Redirects" value={redirectsCount.count ?? 0} />
        <Card
          label="Slug history entries"
          value={historyCount.count ?? 0}
        />
        <Card
          label="404s (last 30 days)"
          value={notFoundCount.count ?? 0}
        />
        <Card
          label="Products missing descriptions"
          value={missingDescriptionsCount.count ?? 0}
        />
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
