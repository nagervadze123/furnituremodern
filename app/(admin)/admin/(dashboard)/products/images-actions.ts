// Server actions for product images. Separate file from the main
// product actions to keep this concern self-contained: insertion is
// done by the browser uploader (via the user's auth session), but DB
// metadata writes and deletes go through these admin-side actions.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const addImageSchema = z.object({
  product_id: z.string().uuid(),
  storage_path: z.string().min(1).max(2048),
  alt_ka: z.string().max(500).default(""),
  alt_en: z.string().max(500).default(""),
});

/** Add a row to product_images after the file has been uploaded to storage. */
export async function addProductImageAction(input: {
  product_id: string;
  storage_path: string;
  alt_ka?: string;
  alt_en?: string;
}): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const parsed = addImageSchema.parse(input);

  const supabase = createSupabaseAdminClient();
  // Determine sort_order: append after existing images.
  const { count } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", parsed.product_id);

  const isFirst = (count ?? 0) === 0;

  const { error } = await supabase.from("product_images").insert({
    product_id: parsed.product_id,
    storage_path: parsed.storage_path,
    alt_ka: parsed.alt_ka,
    alt_en: parsed.alt_en,
    sort_order: count ?? 0,
    is_primary: isFirst,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/[locale]/[category]/[slug]", "page");
  revalidatePath("/[locale]/[category]", "page");
  return { ok: true };
}

/** Delete an image row + remove the underlying file from storage. */
export async function deleteProductImageAction(
  imageId: string
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!imageId) return { ok: false, message: "Missing image id." };

  const supabase = createSupabaseAdminClient();

  // Read the row first so we know what file to delete from storage.
  const { data: existing, error: fetchErr } = await supabase
    .from("product_images")
    .select("id, storage_path, product_id, is_primary")
    .eq("id", imageId)
    .single();
  if (fetchErr || !existing) {
    return { ok: false, message: "Image not found." };
  }

  // If the storage_path is a fully-qualified URL (placeholder seed
  // data), there is nothing to remove from storage — skip that step.
  const isExternal = /^https?:\/\//i.test(existing.storage_path);

  const { error: dbErr } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);
  if (dbErr) return { ok: false, message: dbErr.message };

  if (!isExternal) {
    await supabase.storage
      .from("product-images")
      .remove([existing.storage_path]);
  }

  // If we just deleted the primary, promote the next one.
  if (existing.is_primary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", existing.product_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();
    if (next) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", next.id);
    }
  }

  revalidatePath("/[locale]/[category]/[slug]", "page");
  revalidatePath("/[locale]/[category]", "page");
  return { ok: true };
}
