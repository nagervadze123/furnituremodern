// Redirects list + add/delete. Mirrors the categories editor pattern.

"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  upsertRedirectAction,
  deleteRedirectAction,
  type ActionState,
} from "@/app/(admin)/admin/(dashboard)/redirects/actions";
import { Button } from "@/components/ui/button";

type RedirectRow = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  created_at: string;
};

const INITIAL_STATE: ActionState = { ok: false };

export function RedirectsEditor({ redirects }: { redirects: RedirectRow[] }) {
  return (
    <div className="space-y-6">
      <NewRedirectForm />
      <ExistingRedirects redirects={redirects} />
    </div>
  );
}

function NewRedirectForm() {
  const bound = upsertRedirectAction.bind(null, null);
  const [state, formAction, pending] = useActionState(bound, INITIAL_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="rounded-xl border border-border bg-background p-4">
      <p className="mb-3 text-sm font-medium">Add a redirect</p>
      {state.message ? (
        <p
          className={
            state.ok
              ? "mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
              : "mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
      {/* Grid is single-column on narrow phones (so the path fields
          have enough room for `/ka/category/very-long-slug`) and only
          collapses to the From/To/Submit row at sm+. min-w-0 on the
          field wrappers stops the long monospace text from forcing the
          grid wider than the parent. */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="min-w-0">
          <Field label="From" error={fieldErrors.from_path} hint="e.g. /ka/sofas/old-slug">
            <input
              name="from_path"
              placeholder="/ka/sofas/old-slug"
              required
              className={inputClass}
            />
          </Field>
        </div>
        <div className="min-w-0">
          <Field label="To" error={fieldErrors.to_path} hint="e.g. /ka/sofas/new-slug">
            <input
              name="to_path"
              placeholder="/ka/sofas/new-slug"
              required
              className={inputClass}
            />
          </Field>
        </div>
        <input type="hidden" name="status_code" value="301" />
        <Button type="submit" disabled={pending} className="min-h-11 gap-1.5">
          <Plus aria-hidden className="h-4 w-4" />
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}

function ExistingRedirects({ redirects }: { redirects: RedirectRow[] }) {
  if (redirects.length === 0) {
    return (
      <p className="rounded-md border border-border bg-background p-6 text-sm text-muted-foreground">
        No redirects yet.
      </p>
    );
  }

  return (
    // `scroll-x-touch` wraps the table in an intentional horizontal
    // scroll container — long path columns can be wider than a phone
    // viewport, and that's expected for admin inspection. min-w-[40rem]
    // on the table ensures columns don't squish into uselessness on
    // narrow screens; users scroll the table, not the page.
    <div className="scroll-x-touch rounded-xl border border-border bg-background">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">From</th>
            <th className="px-4 py-2 font-medium">To</th>
            <th className="px-4 py-2 font-medium">Code</th>
            <th className="px-4 py-2" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {redirects.map((r) => (
            <RedirectRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RedirectRow({ row }: { row: RedirectRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm(`Delete the redirect from ${row.from_path}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRedirectAction(row.id);
      if (!result.ok) setError(result.message ?? "Delete failed.");
    });
  };

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3 font-mono text-xs">{row.from_path}</td>
      <td className="px-4 py-3 font-mono text-xs">{row.to_path}</td>
      <td className="px-4 py-3 tabular-nums">{row.status_code}</td>
      <td className="px-4 py-3 text-right">
        {error ? (
          <span className="mr-3 text-xs text-destructive">{error}</span>
        ) : null}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          // min-h-10 makes the delete tap zone reachable for fingers
          // without changing the visual density of the table row.
          className="inline-flex min-h-10 items-center gap-1 rounded px-2 -mx-2 text-sm text-destructive hover:underline disabled:opacity-50"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          {pending ? "…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

// See product-form.tsx for the rationale; this variant keeps font-mono
// for the path inputs because admins read the slugs character-by-char.
const inputClass =
  "block w-full min-w-0 min-h-10 rounded-md border border-input bg-background px-3 py-2 text-base font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
