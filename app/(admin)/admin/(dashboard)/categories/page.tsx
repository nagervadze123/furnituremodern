// /admin/categories — list, create, edit, soft-delete and restore
// categories. Categories are a small fixed set, so a list + inline
// forms is faster than a separate detail page per row.
//
// Phase 5 Task 3: this page now also surfaces:
//   • intro_ka / intro_en  — the 80–120 word category-page hero copy
//   • is_featured_in_nav   — top-nav inclusion (max 5 enforced server-side)
//   • is_deleted           — soft-delete state, with a Restore action

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CategoriesEditor } from "@/components/admin/categories-editor";

export default async function AdminCategoriesPage() {
  const supabase = createSupabaseAdminClient();
  // Include soft-deleted rows so the operator can restore them. Sort
  // so active rows render first (false < true), then by sort_order.
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name_ka, name_en, description_ka, description_en, intro_ka, intro_en, sort_order, is_featured_in_nav, is_deleted"
    )
    .order("is_deleted", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Categories drive the URL structure. Renaming the slug
        automatically records the change in <code>category_slug_history</code>{" "}
        and adds 301 redirects from the old paths. Hidden categories
        keep their products linked and can be restored.
      </p>

      {error ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="mt-8">
        <CategoriesEditor categories={data ?? []} />
      </div>
    </div>
  );
}
