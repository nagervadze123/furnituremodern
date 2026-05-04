// Editor for the categories list. Renders one expandable row per
// category with an inline form, plus a "new category" form at the top.
//
// Client component because we expand/collapse rows and toggle the
// nav-flag enforcement live; the actual save runs through server
// actions. The max-5 nav cap is enforced both here (UI hint) and in
// the server action (authoritative).

"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  upsertCategoryAction,
  deleteCategoryAction,
  restoreCategoryAction,
  type ActionState,
} from "@/app/(admin)/admin/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";

// Mirrors lib/admin/category-slug-rename-effects.ts; kept duplicated
// here so the client bundle doesn't import the server-only file.
const MAX_FEATURED_NAV = 5;

type CategoryRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  intro_ka: string;
  intro_en: string;
  sort_order: number;
  is_featured_in_nav: boolean;
  is_deleted: boolean;
};

type Props = { categories: CategoryRow[] };

const INITIAL_STATE: ActionState = { ok: false };

export function CategoriesEditor({ categories }: Props) {
  const [openId, setOpenId] = useState<string | "new" | null>(null);

  // Active rows already at the top-nav cap. The form below greys out
  // the toggle when the cap is full and the row is currently OFF.
  const featuredCount = useMemo(
    () =>
      categories.filter((c) => !c.is_deleted && c.is_featured_in_nav).length,
    [categories]
  );

  return (
    <div className="space-y-3">
      {/* Add new */}
      <div className="rounded-xl border border-border bg-background">
        <button
          type="button"
          className="flex min-h-12 w-full items-center gap-2 p-4 text-left text-sm font-medium"
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
                intro_ka: "",
                intro_en: "",
                sort_order: categories.filter((c) => !c.is_deleted).length,
                is_featured_in_nav: false,
                is_deleted: false,
              }}
              actionId={null}
              featuredCount={featuredCount}
              onSaved={() => setOpenId(null)}
            />
          </div>
        ) : null}
      </div>

      {/* Existing categories — active first, then soft-deleted. */}
      {categories.map((c) => (
        <div
          key={c.id}
          className={
            c.is_deleted
              ? "rounded-xl border border-dashed border-border bg-muted/30"
              : "rounded-xl border border-border bg-background"
          }
        >
          <button
            type="button"
            className="flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-1 p-4 text-left"
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
            aria-expanded={openId === c.id}
          >
            <span className="text-sm font-medium break-words">{c.name_en}</span>
            <span className="text-xs text-muted-foreground break-words">
              {c.name_ka}
            </span>
            {c.is_deleted ? (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                Hidden
              </span>
            ) : c.is_featured_in_nav ? (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                In nav
              </span>
            ) : null}
            <code className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">
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
                  intro_ka: c.intro_ka ?? "",
                  intro_en: c.intro_en ?? "",
                  sort_order: c.sort_order,
                  is_featured_in_nav: c.is_featured_in_nav,
                  is_deleted: c.is_deleted,
                }}
                actionId={c.id}
                featuredCount={featuredCount}
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
  featuredCount,
  onSaved,
}: {
  defaults: {
    slug: string;
    name_ka: string;
    name_en: string;
    description_ka: string;
    description_en: string;
    intro_ka: string;
    intro_en: string;
    sort_order: number;
    is_featured_in_nav: boolean;
    is_deleted: boolean;
  };
  actionId: string | null;
  featuredCount: number;
  onSaved: () => void;
}) {
  const bound = upsertCategoryAction.bind(null, actionId);
  const [state, formAction, pending] = useActionState(bound, INITIAL_STATE);
  const [softDeletePending, startSoftDeleteTransition] = useTransition();
  const [restorePending, startRestoreTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-close when a save succeeds.
  if (state.ok && !pending) {
    queueMicrotask(onSaved);
  }

  const navCapReached =
    !defaults.is_featured_in_nav && featuredCount >= MAX_FEATURED_NAV;

  const handleSoftDelete = () => {
    if (!actionId) return;
    if (
      !confirm(
        "Hide this category? Existing products keep their link and will reappear automatically when you restore the category."
      )
    ) {
      return;
    }
    setActionError(null);
    startSoftDeleteTransition(async () => {
      const result = await deleteCategoryAction(actionId);
      if (!result.ok) setActionError(result.message ?? "Hide failed.");
      else onSaved();
    });
  };

  const handleRestore = () => {
    if (!actionId) return;
    setActionError(null);
    startRestoreTransition(async () => {
      const result = await restoreCategoryAction(actionId);
      if (!result.ok) setActionError(result.message ?? "Restore failed.");
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
      {actionError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="English intro (80–120 words)"
          error={fieldErrors.intro_en}
        >
          <textarea
            name="intro_en"
            defaultValue={defaults.intro_en}
            rows={5}
            className={inputClass + " font-sans leading-relaxed"}
          />
        </Field>
        <Field
          label="Georgian intro (80–120 words)"
          error={fieldErrors.intro_ka}
        >
          <textarea
            name="intro_ka"
            defaultValue={defaults.intro_ka}
            rows={5}
            className={inputClass + " font-sans leading-relaxed"}
          />
        </Field>
      </div>

      <Field
        label="Show in top navigation"
        error={fieldErrors.is_featured_in_nav}
      >
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="is_featured_in_nav"
            defaultChecked={defaults.is_featured_in_nav}
            disabled={navCapReached}
            className="h-4 w-4 rounded border-input"
          />
          {navCapReached ? (
            <span>
              Top-nav cap reached ({MAX_FEATURED_NAV}). Untoggle another
              category first.
            </span>
          ) : (
            <span>
              Up to {MAX_FEATURED_NAV} categories can appear in the
              header. Currently {featuredCount}/{MAX_FEATURED_NAV}.
            </span>
          )}
        </label>
      </Field>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        {actionId ? (
          defaults.is_deleted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={restorePending}
              className="gap-1.5"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleSoftDelete}
              disabled={softDeletePending}
              className="gap-1.5"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              Hide
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}

// See product-form.tsx for the rationale on this input baseline:
// 40px hit area, base text size on phones to dodge iOS auto-zoom,
// `min-w-0` to allow safe shrinking inside a grid cell.
const inputClass =
  "block w-full min-w-0 min-h-10 rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

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
