// Product form — shared by /admin/products/new and /admin/products/[id]/edit.
//
// Client component because we want instant slug suggestions and inline
// validation. The actual write happens server-side via the appropriate
// action passed in as a prop.

"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  suggestSlugAction,
  type ActionState,
} from "@/app/(admin)/admin/(dashboard)/products/actions";
import { slugify } from "@/lib/slug";

export type CategoryOption = {
  id: string;
  slug: string;
  name_en: string;
};

export type ProductFormDefaults = {
  id?: string;
  slug: string;
  category_id: string;
  name_ka: string;
  name_en: string;
  description_ka: string;
  description_en: string;
  price: number | string;
  is_featured: boolean;
  is_new: boolean;
  is_published: boolean;
  sort_order: number;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: ProductFormDefaults;
  categories: CategoryOption[];
  submitLabel?: string;
};

const INITIAL_STATE: ActionState = { ok: false };

export function ProductForm({
  action,
  defaults,
  categories,
  submitLabel = "Save",
}: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // Slug auto-fill. The single source of truth is `slugAuthoredRef`:
  //   - false → auto-fill from the English name on every change
  //   - true  → never auto-fill again for the lifetime of this mount
  // Initial state: TRUE on edit (defaults.slug is non-empty, so the
  // saved value is treated as user-authored and never overwritten),
  // FALSE on the new-product form (empty slug, auto-fill should run
  // until the admin types in the slug field).
  const [slug, setSlug] = useState(defaults.slug);
  const [nameEn, setNameEn] = useState(defaults.name_en);
  const [nameKa, setNameKa] = useState(defaults.name_ka);
  const slugAuthoredRef = useRef(defaults.slug.trim().length > 0);

  // Live preview of the slug the form would submit. Reflects the manual
  // override when present; otherwise prefers the Georgian name (the
  // primary locale) and falls back to the English name. Pure client —
  // routed through lib/slug.slugify which now transliterates Georgian.
  const previewSlug = useMemo(() => {
    const manual = slug.trim();
    if (manual) return manual;
    return slugify(nameKa) || slugify(nameEn);
  }, [slug, nameKa, nameEn]);

  useEffect(() => {
    if (slugAuthoredRef.current) return;
    if (!nameEn) return;
    let cancelled = false;
    suggestSlugAction(nameEn).then((suggestion) => {
      if (cancelled || !suggestion) return;
      // Re-check the ref inside the resolved promise: the admin may
      // have typed in the slug field while the round-trip was inflight.
      if (slugAuthoredRef.current) return;
      setSlug(suggestion);
    });
    return () => {
      cancelled = true;
    };
  }, [nameEn]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {/*
        Form-level message. role="status" + aria-live="polite" makes
        screen readers announce success/failure without interrupting,
        WCAG 4.1.3 (Status Messages). Wrapping in a stable region with
        role="status" guarantees the announcement even when the message
        node mounts/unmounts on each submit cycle.
      */}
      <div role="status" aria-live="polite">
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="English name" name="name_en" error={fieldErrors.name_en}>
          {(ids) => (
            <input
              id={ids.input}
              name="name_en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
              aria-required="true"
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.name_en ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Georgian name (ქართული)" name="name_ka" error={fieldErrors.name_ka}>
          {(ids) => (
            <input
              id={ids.input}
              name="name_ka"
              value={nameKa}
              onChange={(e) => setNameKa(e.target.value)}
              required
              aria-required="true"
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.name_ka ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Slug"
          name="slug"
          error={fieldErrors.slug}
          hint="Lowercase, dashes, ASCII only. Auto-filled from the English name."
        >
          {(ids) => (
            <>
              <input
                id={ids.input}
                name="slug"
                value={slug}
                onChange={(e) => {
                  slugAuthoredRef.current = true;
                  setSlug(e.target.value);
                }}
                required
                aria-required="true"
                aria-describedby={ids.describedBy}
                aria-invalid={fieldErrors.slug ? true : undefined}
                className={inputClass + " font-mono"}
              />
              {previewSlug && previewSlug !== slug.trim() ? (
                <p
                  className="mt-1 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  Preview: <code className="font-mono">{previewSlug}</code>
                </p>
              ) : null}
            </>
          )}
        </Field>
        <Field label="Category" name="category_id" error={fieldErrors.category_id}>
          {(ids) => (
            <select
              id={ids.input}
              name="category_id"
              defaultValue={defaults.category_id}
              required
              aria-required="true"
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.category_id ? true : undefined}
              className={inputClass}
            >
              <option value="" disabled>
                Choose…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="English description"
          name="description_en"
          error={fieldErrors.description_en}
        >
          {(ids) => (
            <textarea
              id={ids.input}
              name="description_en"
              defaultValue={defaults.description_en}
              rows={4}
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.description_en ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          label="Georgian description (აღწერა)"
          name="description_ka"
          error={fieldErrors.description_ka}
        >
          {(ids) => (
            <textarea
              id={ids.input}
              name="description_ka"
              defaultValue={defaults.description_ka}
              rows={4}
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.description_ka ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Price (GEL)" name="price" error={fieldErrors.price}>
          {(ids) => (
            <input
              id={ids.input}
              type="number"
              name="price"
              min={0}
              step={1}
              defaultValue={String(defaults.price)}
              required
              aria-required="true"
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.price ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Sort order" name="sort_order" error={fieldErrors.sort_order}>
          {(ids) => (
            <input
              id={ids.input}
              type="number"
              name="sort_order"
              step={1}
              defaultValue={String(defaults.sort_order)}
              aria-describedby={ids.describedBy}
              aria-invalid={fieldErrors.sort_order ? true : undefined}
              className={inputClass}
            />
          )}
        </Field>
        <input type="hidden" name="currency" value="GEL" />
      </div>

      {/* Checkbox rows wrap on narrow phones; min-h-10 gives each row a
          tappable hit zone even though the checkbox itself is small.
          Wrapping the input INSIDE the <label> implicitly associates
          them — no htmlFor required (WCAG 1.3.1, 4.1.2). */}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={defaults.is_published}
            className="size-4"
          />
          Published
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={defaults.is_featured}
            className="size-4"
          />
          Featured (shown on home page)
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_new"
            defaultChecked={defaults.is_new}
            className="size-4"
          />
          New (renders the editorial "new" badge on the catalogue card)
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={pending}
          // aria-busy announces loading state to AT users — pairs with
          // the visible "Saving…" label and the disabled attribute.
          // WCAG 4.1.3 Status Messages.
          aria-busy={pending || undefined}
          className="min-h-11"
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// min-h-10 gives every input/select/textarea row a 40px minimum hit
// height — comfortable on touch without bloating the desktop form.
// `text-base` on phones (sm:text-sm at ≥640px) prevents iOS Safari
// from auto-zooming when the input is focused (it triggers when the
// computed font-size is below 16px). `min-w-0` lets selects shrink
// inside a grid cell instead of forcing a horizontal scroll.
const inputClass =
  "block w-full min-w-0 min-h-10 rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

// Field wraps a labelled input with hint + error rendering, returning
// stable ids to the child renderer so the caller can wire htmlFor on
// the label, aria-describedby on the input (for hint + error), and
// aria-invalid when there's an error. Generated once per Field via
// useId() so SSR + CSR ids always match (WCAG 1.3.1, 4.1.2).
function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  // `name` participates in the generated ids so the resulting DOM
  // attribute reads as "field-name_en" instead of an opaque hash —
  // easier to spot in browser devtools when debugging an a11y tree.
  name: string;
  error?: string;
  hint?: string;
  children: (ids: {
    input: string;
    hint: string;
    error: string;
    /**
     * Concatenated id list for `aria-describedby`, or undefined when
     * there's nothing to describe. Always reference both the hint and
     * the error so the announcement order is stable.
     */
    describedBy: string | undefined;
  }) => React.ReactNode;
}) {
  const reactId = useId();
  const ids = {
    input: `${reactId}-${name}`,
    hint: `${reactId}-${name}-hint`,
    error: `${reactId}-${name}-error`,
  };
  const describedByParts: string[] = [];
  if (hint && !error) describedByParts.push(ids.hint);
  if (error) describedByParts.push(ids.error);
  const describedBy =
    describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

  return (
    <div>
      <label htmlFor={ids.input} className="block text-sm font-medium">
        {label}
      </label>
      <div className="mt-1">{children({ ...ids, describedBy })}</div>
      {hint && !error ? (
        <p id={ids.hint} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
