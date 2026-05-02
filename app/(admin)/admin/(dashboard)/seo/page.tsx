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
import { deleteRedirectAction } from "../redirects/actions";
import { NotFoundRow } from "@/components/admin/not-found-row";

export const dynamic = "force-dynamic";

// Wraps deleteRedirectAction(id) in a form-friendly server action that
// reads the id out of FormData and returns void. Lets us render a tiny
// inline delete form per redirect row without a Client Component.
async function deleteRedirectFormAction(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await deleteRedirectAction(id);
  }
}

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
    redirectsList,
    notFoundRecent,
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
    supabase
      .from("redirects")
      .select("id, from_path, to_path, status_code, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("not_found_log")
      .select("path, occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);

  const redirects = redirectsList.data ?? [];

  // Aggregate the recent 404s by path. 500 rows / 50 paths is fine for
  // in-memory; if traffic grows this should move into a SQL view.
  const counts = new Map<string, { count: number; lastSeen: string }>();
  for (const row of notFoundRecent.data ?? []) {
    const cur = counts.get(row.path);
    if (cur) {
      cur.count += 1;
    } else {
      counts.set(row.path, { count: 1, lastSeen: row.occurred_at });
    }
  }
  const topNotFounds = [...counts.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 50);

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

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Redirects</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Most-recent 100. The proxy looks these up on every request.
        </p>
        {redirects.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No redirects yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.from_path}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.to_path}</td>
                    <td className="px-3 py-2">{r.status_code}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteRedirectFormAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Recent 404s
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Top 50 missing paths from the last 30 days. Click &ldquo;Create
          redirect&rdquo; to map any of them to a working URL.
        </p>
        {topNotFounds.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No 404s logged in this window.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Hits</th>
                  <th className="px-3 py-2 font-medium">Last seen</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {topNotFounds.map(([path, info]) => (
                  <NotFoundRow
                    key={path}
                    path={path}
                    count={info.count}
                    lastSeen={info.lastSeen}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
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
