"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categorySchema } from "@/lib/admin/schemas";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  formData.forEach((v, k) => (obj[k] = v));
  return obj;
}

function zodToFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidateCategorySurfaces() {
  revalidatePath("/", "page");
  revalidatePath("/[locale]/[category]", "page");
  revalidatePath("/sitemap.xml", "page");
}

export async function upsertCategoryAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  let parsed;
  try {
    parsed = categorySchema.parse(formToObject(formData));
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: zodToFieldErrors(err),
      };
    }
    throw err;
  }

  const supabase = createSupabaseAdminClient();
  let error;
  if (id) {
    ({ error } = await supabase
      .from("categories")
      .update(parsed)
      .eq("id", id));
  } else {
    ({ error } = await supabase.from("categories").insert(parsed));
  }
  if (error) return { ok: false, message: error.message };

  revalidateCategorySurfaces();
  return { ok: true, message: id ? "Saved." : "Category created." };
}

export async function deleteCategoryAction(
  id: string
): Promise<ActionState> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();

  // Refuse to delete categories that still have products attached
  // (the FK has ON DELETE RESTRICT but we surface a friendlier error).
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Cannot delete: ${count} products still belong to this category.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateCategorySurfaces();
  return { ok: true };
}
