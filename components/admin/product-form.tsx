// Product form — shared by /admin/products/new and /admin/products/[id]/edit.
//
// Client component because we want instant slug suggestions and inline
// validation. The actual write happens server-side via the appropriate
// action passed in as a prop.

"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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

  // Slug auto-suggest. We only suggest while the slug field is empty
  // OR matches the previous suggestion — never overwrite a manual edit.
  const [slug, setSlug] = useState(defaults.slug);
  const [nameEn, setNameEn] = useState(defaults.name_en);
  const [nameKa, setNameKa] = useState(defaults.name_ka);
  const lastSuggestionRef = useRef(defaults.slug);

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
    let cancelled = false;
    const previous = lastSuggestionRef.current;
    // Only suggest if the slug field is currently the previous suggestion.
    if (slug !== previous && slug.length > 0) return;
    if (!nameEn) return;
    suggestSlugAction(nameEn).then((suggestion) => {
      if (cancelled || !suggestion) return;
      lastSuggestionRef.current = suggestion;
      setSlug(suggestion);
    });
    return () => {
      cancelled = true;
    };
  }, [nameEn, slug]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="English name" error={fieldErrors.name_en}>
          <input
            name="name_en"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Georgian name (ქართული)" error={fieldErrors.name_ka}>
          <input
            name="name_ka"
            value={nameKa}
            onChange={(e) => setNameKa(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Slug"
          error={fieldErrors.slug}
          hint="Lowercase, dashes, ASCII only. Auto-filled from the English name."
        >
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
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
        </Field>
        <Field label="Category" error={fieldErrors.category_id}>
          <select
            name="category_id"
            defaultValue={defaults.category_id}
            required
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
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="English description"
          error={fieldErrors.description_en}
        >
          <textarea
            name="description_en"
            defaultValue={defaults.description_en}
            rows={4}
            className={inputClass}
          />
        </Field>
        <Field
          label="Georgian description (აღწერა)"
          error={fieldErrors.description_ka}
        >
          <textarea
            name="description_ka"
            defaultValue={defaults.description_ka}
            rows={4}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Price (GEL)" error={fieldErrors.price}>
          <input
            type="number"
            name="price"
            min={0}
            step={1}
            defaultValue={String(defaults.price)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Sort order" error={fieldErrors.sort_order}>
          <input
            type="number"
            name="sort_order"
            step={1}
            defaultValue={String(defaults.sort_order)}
            className={inputClass}
          />
        </Field>
        <input type="hidden" name="currency" value="GEL" />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={defaults.is_published}
          />
          Published
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={defaults.is_featured}
          />
          Featured (shown on home page)
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
      <label className="block text-sm font-medium">{label}</label>
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
