// /admin/categories — single page that lists, creates, edits, and
// deletes categories. Categories are a small fixed set, so a list +
// inline forms is faster than a separate detail page per row.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CategoriesEditor } from "@/components/admin/categories-editor";

export default async function AdminCategoriesPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name_ka, name_en, description_ka, description_en, sort_order"
    )
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Categories drive the URL structure. Renaming a category does not
        change its slug — to change the URL, edit the slug field
        directly.
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
