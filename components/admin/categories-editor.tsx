// Editor for the categories list. Renders one expandable row per
// category with an inline form, plus a "new category" form at the top.
//
// Client component because we expand/collapse rows; the actual save
// runs through server actions.

"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  upsertCategoryAction,
  deleteCategoryAction,
  type ActionState,
} from "@/app/(admin)/admin/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";

type CategoryRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  sort_order: number;
};

type Props = { categories: CategoryRow[] };

const INITIAL_STATE: ActionState = { ok: false };

export function CategoriesEditor({ categories }: Props) {
  const [openId, setOpenId] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-3">
      {/* Add new */}
      <div className="rounded-xl border border-border bg-background">
        <button
          type="button"
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-medium"
          onClick={() => setOpenId(openId === "new" ? null : "new")}
          aria-expanded={openId === "new"}
        >
          <Plus aria-hidden className="h-4 w-4" />
          New category
          {openId === "new" ? (
            <ChevronDown aria-hidden className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight aria-hidden className="ml-auto h-4 w-4" />
          )}
        </button>
        {openId === "new" ? (
          <div className="border-t border-border p-4">
            <CategoryForm
              defaults={{
                slug: "",
                name_ka: "",
                name_en: "",
                description_ka: "",
                description_en: "",
                sort_order: categories.length,
              }}
              actionId={null}
              onSaved={() => setOpenId(null)}
            />
          </div>
        ) : null}
      </div>

      {/* Existing categories */}
      {categories.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-background">
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left"
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
            aria-expanded={openId === c.id}
          >
            <span className="text-sm font-medium">{c.name_en}</span>
            <span className="text-xs text-muted-foreground">{c.name_ka}</span>
            <code className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /{c.slug}
            </code>
            {openId === c.id ? (
              <ChevronDown aria-hidden className="h-4 w-4" />
            ) : (
              <ChevronRight aria-hidden className="h-4 w-4" />
            )}
          </button>
          {openId === c.id ? (
            <div className="border-t border-border p-4">
              <CategoryForm
                defaults={{
                  slug: c.slug,
                  name_ka: c.name_ka,
                  name_en: c.name_en,
                  description_ka: c.description_ka,
                  description_en: c.description_en,
                  sort_order: c.sort_order,
                }}
                actionId={c.id}
                onSaved={() => setOpenId(null)}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CategoryForm({
  defaults,
  actionId,
  onSaved,
}: {
  defaults: {
    slug: string;
    name_ka: string;
    name_en: string;
    description_ka: string;
    description_en: string;
    sort_order: number;
  };
  actionId: string | null;
  onSaved: () => void;
}) {
  const bound = upsertCategoryAction.bind(null, actionId);
  const [state, formAction, pending] = useActionState(bound, INITIAL_STATE);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Auto-close when a save succeeds.
  if (state.ok && !pending) {
    queueMicrotask(onSaved);
  }

  const handleDelete = () => {
    if (!actionId) return;
    if (!confirm("Delete this category? Products must be empty first."))
      return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteCategoryAction(actionId);
      if (!result.ok) setDeleteError(result.message ?? "Delete failed.");
      else onSaved();
    });
  };

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
      {deleteError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="English name" error={fieldErrors.name_en}>
          <input
            name="name_en"
            defaultValue={defaults.name_en}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Georgian name" error={fieldErrors.name_ka}>
          <input
            name="name_ka"
            defaultValue={defaults.name_ka}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" error={fieldErrors.slug}>
          <input
            name="slug"
            defaultValue={defaults.slug}
            required
            className={inputClass + " font-mono"}
          />
        </Field>
        <Field label="Sort order" error={fieldErrors.sort_order}>
          <input
            type="number"
            name="sort_order"
            defaultValue={String(defaults.sort_order)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="English tagline"
          error={fieldErrors.description_en}
        >
          <input
            name="description_en"
            defaultValue={defaults.description_en}
            className={inputClass}
          />
        </Field>
        <Field
          label="Georgian tagline"
          error={fieldErrors.description_ka}
        >
          <input
            name="description_ka"
            defaultValue={defaults.description_ka}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        {actionId ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deletePending}
            className="gap-1.5"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
