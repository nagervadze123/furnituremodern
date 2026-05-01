"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirectSchema } from "@/lib/admin/schemas";

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

export async function upsertRedirectAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  let parsed;
  try {
    parsed = redirectSchema.parse(formToObject(formData));
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

  if (parsed.from_path === parsed.to_path) {
    return {
      ok: false,
      message: "From and To paths cannot be identical.",
    };
  }

  const supabase = createSupabaseAdminClient();
  if (id) {
    const { error } = await supabase
      .from("redirects")
      .update(parsed)
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    // Use upsert so re-adding a from_path that exists overwrites
    // gracefully instead of failing on the unique constraint.
    const { error } = await supabase
      .from("redirects")
      .upsert(parsed, { onConflict: "from_path" });
    if (error) return { ok: false, message: error.message };
  }

  // Revalidate everything — a redirect can affect any URL.
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Saved." : "Redirect added." };
}

export async function deleteRedirectAction(
  id: string
): Promise<ActionState> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
