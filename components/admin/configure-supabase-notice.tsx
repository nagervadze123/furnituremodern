// Shown across the admin panel when Supabase env vars are not set.
// Keeps the UI useful in offline development instead of crashing.

import { ExternalLink } from "lucide-react";

export function ConfigureSupabaseNotice() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-background p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Supabase not configured
      </h1>
      <p className="mt-3 text-muted-foreground">
        The admin panel needs a Supabase project to manage products and
        users. Set the following environment variables and restart:
      </p>
      <pre className="mt-4 rounded-md bg-muted p-4 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
      </pre>
      <p className="mt-4 text-sm text-muted-foreground">
        See <code>README.md</code> § Supabase setup, then run
        <code className="mx-1 rounded bg-muted px-1 py-0.5">
          supabase/schema.sql
        </code>
        followed by
        <code className="mx-1 rounded bg-muted px-1 py-0.5">
          supabase/seed.sql
        </code>
        to get started.
      </p>
      <p className="mt-6 text-sm">
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-foreground underline"
        >
          Open Supabase dashboard
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </p>
    </div>
  );
}
