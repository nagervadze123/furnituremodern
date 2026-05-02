// Server actions for the /admin/seo dashboard.
//
//   • createRedirectFrom404Action — turn a logged 404 into a 301 redirect
//   • cleanupOrphanSlugAction      — delete a stale product_slug_history row
//
// Both are admin-only and write through the service-role client.

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SeoActionResult = { ok: boolean; message?: string };

export async function createRedirectFrom404Action(
  fromPath: string,
  toPath: string
): Promise<SeoActionResult> {
  await requireAdmin();
  if (!fromPath || !toPath) return { ok: false, message: "Missing path." };
  if (fromPath === toPath) {
    return { ok: false, message: "From and To cannot match." };
  }
  if (!fromPath.startsWith("/") || !toPath.startsWith("/")) {
    return { ok: false, message: "Both paths must start with /." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("redirects")
    .upsert(
      { from_path: fromPath, to_path: toPath, status_code: 301 },
      { onConflict: "from_path" }
    );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cleanupOrphanSlugAction(
  historyId: string
): Promise<SeoActionResult> {
  await requireAdmin();
  if (!historyId) return { ok: false, message: "Missing id." };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_slug_history")
    .delete()
    .eq("id", historyId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/seo", "page");
  return { ok: true };
}
