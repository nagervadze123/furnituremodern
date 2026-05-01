// /admin/redirects — list, add, delete URL redirects.
// The proxy looks up this table on every request to issue 301s.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RedirectsEditor } from "@/components/admin/redirects-editor";

export default async function AdminRedirectsPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("redirects")
    .select("id, from_path, to_path, status_code, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Redirects</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        301 redirects for URLs that have moved. Slug changes in the
        product editor automatically write into this table.
      </p>

      {error ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="mt-8">
        <RedirectsEditor redirects={data ?? []} />
      </div>
    </div>
  );
}
