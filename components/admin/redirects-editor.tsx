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
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="From" error={fieldErrors.from_path} hint="e.g. /ka/sofas/old-slug">
          <input
            name="from_path"
            placeholder="/ka/sofas/old-slug"
            required
            className={inputClass}
          />
        </Field>
        <Field label="To" error={fieldErrors.to_path} hint="e.g. /ka/sofas/new-slug">
          <input
            name="to_path"
            placeholder="/ka/sofas/new-slug"
            required
            className={inputClass}
          />
        </Field>
        <input type="hidden" name="status_code" value="301" />
        <Button type="submit" disabled={pending} className="gap-1.5">
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
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full text-sm">
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
          className="inline-flex items-center gap-1 text-sm text-destructive hover:underline disabled:opacity-50"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          {pending ? "…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
