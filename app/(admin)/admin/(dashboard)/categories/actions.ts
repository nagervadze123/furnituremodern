"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categorySchema } from "@/lib/admin/schemas";
import { notifyRevalidation } from "@/lib/revalidation/notify";
import {
  recordCategorySlugChange,
  writeCategorySlugRedirects,
} from "@/lib/admin/category-slug-rename-effects";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Hard cap on the number of categories that can flag
// `is_featured_in_nav = true`. The admin UI greys out the toggle past
// the cap; this constant is the server-side guard so a tampered form
// payload still can't widen the menu.
const MAX_FEATURED_NAV = 5;

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

async function revalidateCategorySurfaces() {
  await notifyRevalidation({
    paths: [
      { path: "/", type: "page" },
      { path: "/[locale]/[category]", type: "page" },
      { path: "/sitemap.xml", type: "page" },
    ],
  });
}

export async function upsertCategoryAction(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

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

  // Featured-nav cap: count OTHER active rows already flagged true.
  // The form sends a checkbox; if the operator is trying to turn it
  // ON and the cap is full, refuse here so the menu can't silently
  // grow to 6+ items.
  if (parsed.is_featured_in_nav) {
    let countQuery = supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("is_featured_in_nav", true)
      .eq("is_deleted", false);
    if (id) countQuery = countQuery.neq("id", id);
    const { count, error: countError } = await countQuery;
    if (countError) return { ok: false, message: countError.message };
    if ((count ?? 0) >= MAX_FEATURED_NAV) {
      return {
        ok: false,
        message: `At most ${MAX_FEATURED_NAV} categories can appear in the top nav. Untoggle one before adding another.`,
        fieldErrors: { is_featured_in_nav: "Cap reached." },
      };
    }
  }

  // For an UPDATE we need the previous slug + product list to
  // generate slug-rename side effects (history + redirects). For an
  // INSERT we just write the row.
  let prevSlug: string | null = null;
  let productSlugs: string[] = [];
  if (id) {
    const { data: prev, error: prevError } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", id)
      .single();
    if (prevError) return { ok: false, message: prevError.message };
    prevSlug = prev?.slug ?? null;

    if (prevSlug !== parsed.slug) {
      const { data: prods, error: prodError } = await supabase
        .from("products")
        .select("slug")
        .eq("category_id", id);
      if (prodError) return { ok: false, message: prodError.message };
      productSlugs = (prods ?? []).map((p) => p.slug);
    }
  }

  let writeError;
  if (id) {
    ({ error: writeError } = await supabase
      .from("categories")
      .update(parsed)
      .eq("id", id));
  } else {
    ({ error: writeError } = await supabase.from("categories").insert(parsed));
  }
  if (writeError) return { ok: false, message: writeError.message };

  // Slug rename side effects. Only when both id and prev/new differ.
  if (id && prevSlug !== null && prevSlug !== parsed.slug) {
    const history = await recordCategorySlugChange({
      supabase,
      categoryId: id,
      changedBy: admin.userId,
      oldSlug: prevSlug,
    });
    if (!history.ok) return { ok: false, message: history.message };

    const redirects = await writeCategorySlugRedirects({
      supabase,
      oldSlug: prevSlug,
      newSlug: parsed.slug,
      productSlugs,
    });
    if (!redirects.ok) return { ok: false, message: redirects.message };
  }

  await revalidateCategorySurfaces();
  return { ok: true, message: id ? "Saved." : "Category created." };
}

// Soft delete: flip `is_deleted = true` + stamp `deleted_at`. Existing
// products keep their `category_id` reference but stop showing on the
// public site (the data layer filters by `is_deleted = false`).
//
// Restore by calling `restoreCategoryAction` — the row is recoverable
// for as long as it exists in the table. We deliberately never hard-
// delete from the admin UI; row deletion happens at most via direct
// SQL when the operator is sure no products still reference it.
export async function deleteCategoryAction(
  id: string
): Promise<ActionState> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      // Soft-deleted rows shouldn't keep the nav slot — free it up.
      is_featured_in_nav: false,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  await revalidateCategorySurfaces();
  return { ok: true, message: "Category hidden. Products keep their link and will reappear if you restore the category." };
}

export async function restoreCategoryAction(
  id: string
): Promise<ActionState> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_deleted: false, deleted_at: null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  await revalidateCategorySurfaces();
  return { ok: true, message: "Category restored." };
}
