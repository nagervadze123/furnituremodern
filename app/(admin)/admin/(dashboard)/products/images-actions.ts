// Server actions for product images. Separate file from the main
// product actions to keep this concern self-contained: insertion is
// done by the browser uploader (via the user's auth session), but DB
// metadata writes and deletes go through these admin-side actions.
//
// Every action:
//   • requires admin auth (defense in depth — proxy already gates),
//   • validates input with Zod,
//   • forwards failures to logError with PII-free context, and
//   • returns a structured { ok, message } envelope so the client can
//     react with toast/banner UI.

"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyRevalidation } from "@/lib/revalidation/notify";
import { logError } from "@/lib/observability";
import {
  MAX_IMAGES_PER_PRODUCT,
  type ImageActionResult,
} from "./images-config";

const IMAGE_REVALIDATE_PATHS = [
  { path: "/[locale]/[category]/[slug]", type: "page" as const },
  { path: "/[locale]/[category]", type: "page" as const },
];

const addImageSchema = z.object({
  product_id: z.string().uuid(),
  storage_path: z.string().min(1).max(2048),
  alt_ka: z.string().max(500).default(""),
  alt_en: z.string().max(500).default(""),
});

/**
 * Add a row to product_images after the file has been uploaded to
 * Storage. The first image of a product is auto-promoted to primary;
 * all others are inserted with is_primary=false. Sort order is the
 * current count (i.e. appended to the end).
 */
export async function addProductImageAction(input: {
  product_id: string;
  storage_path: string;
  alt_ka?: string;
  alt_en?: string;
}): Promise<ImageActionResult> {
  await requireAdmin();
  const parsed = addImageSchema.parse(input);

  const supabase = createSupabaseAdminClient();

  // Hard cap: refuse the insert when we'd push past MAX_IMAGES_PER_PRODUCT.
  // The browser-side validator should prevent this, but a tampered
  // request could still hit us — defend at the boundary.
  const { count, error: countErr } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", parsed.product_id);

  if (countErr) {
    logError(countErr, {
      route: "products/images-actions:addProductImage",
      scope: "route",
      tags: { stage: "count" },
    });
    return { ok: false, message: countErr.message };
  }

  const total = count ?? 0;
  if (total >= MAX_IMAGES_PER_PRODUCT) {
    return {
      ok: false,
      message: `Limit reached: a product can have at most ${MAX_IMAGES_PER_PRODUCT} images.`,
    };
  }

  const isFirst = total === 0;

  const { error } = await supabase.from("product_images").insert({
    product_id: parsed.product_id,
    storage_path: parsed.storage_path,
    alt_ka: parsed.alt_ka,
    alt_en: parsed.alt_en,
    sort_order: total,
    is_primary: isFirst,
  });
  if (error) {
    logError(error, {
      route: "products/images-actions:addProductImage",
      scope: "route",
      tags: { stage: "insert" },
    });
    return { ok: false, message: error.message };
  }

  await notifyRevalidation({ paths: IMAGE_REVALIDATE_PATHS });
  return { ok: true };
}

const updateAltSchema = z.object({
  image_id: z.string().uuid(),
  alt_ka: z.string().max(500),
  alt_en: z.string().max(500),
});

/** Update a single image's bilingual alt text. */
export async function updateImageAltAction(input: {
  image_id: string;
  alt_ka: string;
  alt_en: string;
}): Promise<ImageActionResult> {
  await requireAdmin();
  const parsed = updateAltSchema.parse(input);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_images")
    .update({ alt_ka: parsed.alt_ka, alt_en: parsed.alt_en })
    .eq("id", parsed.image_id);
  if (error) {
    logError(error, {
      route: "products/images-actions:updateImageAlt",
      scope: "route",
    });
    return { ok: false, message: error.message };
  }

  await notifyRevalidation({ paths: IMAGE_REVALIDATE_PATHS });
  return { ok: true };
}

/**
 * Promote one image to primary; demote whatever was primary before.
 *
 * The schema guards single-primary-per-product via a partial unique
 * index on (product_id) WHERE is_primary = true. To respect that index
 * during the swap, we demote the existing primary first, then promote
 * the new one. Two statements, brief window where no row is primary.
 *
 * If the second statement fails the product is left without a primary;
 * the deleteProductImage code path also auto-promotes a fallback, so
 * the steady-state always recovers on the next action.
 */
export async function setPrimaryImageAction(imageId: string): Promise<ImageActionResult> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(imageId).success) {
    return { ok: false, message: "Invalid image id." };
  }

  const supabase = createSupabaseAdminClient();

  // Look up the row so we know which product to scope the demote to.
  const { data: target, error: fetchErr } = await supabase
    .from("product_images")
    .select("id, product_id, is_primary")
    .eq("id", imageId)
    .single();
  if (fetchErr || !target) {
    if (fetchErr) {
      logError(fetchErr, {
        route: "products/images-actions:setPrimary",
        scope: "route",
        tags: { stage: "fetch" },
      });
    }
    return { ok: false, message: "Image not found." };
  }

  // No-op fast path.
  if (target.is_primary) return { ok: true };

  // 1. Demote any existing primary for this product.
  const { error: demoteErr } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", target.product_id)
    .eq("is_primary", true);
  if (demoteErr) {
    logError(demoteErr, {
      route: "products/images-actions:setPrimary",
      scope: "route",
      tags: { stage: "demote" },
    });
    return { ok: false, message: demoteErr.message };
  }

  // 2. Promote the chosen image.
  const { error: promoteErr } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (promoteErr) {
    logError(promoteErr, {
      route: "products/images-actions:setPrimary",
      scope: "route",
      tags: { stage: "promote" },
    });
    return { ok: false, message: promoteErr.message };
  }

  await notifyRevalidation({ paths: IMAGE_REVALIDATE_PATHS });
  return { ok: true };
}

const reorderSchema = z.object({
  product_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1).max(MAX_IMAGES_PER_PRODUCT),
});

/**
 * Persist a new image ordering by writing sort_order values matching
 * the array index (0, 1, 2, ...) for each id in ordered_ids.
 *
 * Done as N sequential UPDATE statements rather than a single multi-row
 * UPDATE because the Supabase typed query builder doesn't expose
 * Postgres VALUES-join syntax. N is bounded by MAX_IMAGES_PER_PRODUCT
 * so this stays cheap.
 */
export async function reorderProductImagesAction(input: {
  product_id: string;
  ordered_ids: string[];
}): Promise<ImageActionResult> {
  await requireAdmin();

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid reorder payload." };
  }

  const supabase = createSupabaseAdminClient();

  // Defensive: confirm every id belongs to the same product.
  const { data: rows, error: fetchErr } = await supabase
    .from("product_images")
    .select("id, product_id")
    .in("id", parsed.data.ordered_ids);
  if (fetchErr) {
    logError(fetchErr, {
      route: "products/images-actions:reorder",
      scope: "route",
      tags: { stage: "fetch" },
    });
    return { ok: false, message: fetchErr.message };
  }
  const allBelong = (rows ?? []).every(
    (r) => r.product_id === parsed.data.product_id
  );
  if (!allBelong || (rows ?? []).length !== parsed.data.ordered_ids.length) {
    return {
      ok: false,
      message: "One or more images do not belong to the given product.",
    };
  }

  for (let idx = 0; idx < parsed.data.ordered_ids.length; idx++) {
    const id = parsed.data.ordered_ids[idx]!;
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: idx })
      .eq("id", id);
    if (error) {
      logError(error, {
        route: "products/images-actions:reorder",
        scope: "route",
        tags: { stage: "update", idx: String(idx) },
      });
      return { ok: false, message: error.message };
    }
  }

  await notifyRevalidation({ paths: IMAGE_REVALIDATE_PATHS });
  return { ok: true };
}

/** Delete an image row + remove the underlying file from storage. */
export async function deleteProductImageAction(
  imageId: string
): Promise<ImageActionResult> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(imageId).success) {
    return { ok: false, message: "Invalid image id." };
  }

  const supabase = createSupabaseAdminClient();

  // Read the row first so we know what file to delete from storage.
  const { data: existing, error: fetchErr } = await supabase
    .from("product_images")
    .select("id, storage_path, product_id, is_primary")
    .eq("id", imageId)
    .single();
  if (fetchErr || !existing) {
    if (fetchErr) {
      logError(fetchErr, {
        route: "products/images-actions:delete",
        scope: "route",
        tags: { stage: "fetch" },
      });
    }
    return { ok: false, message: "Image not found." };
  }

  // If the storage_path is a fully-qualified URL (placeholder seed
  // data), there is nothing to remove from storage — skip that step.
  const isExternal = /^https?:\/\//i.test(existing.storage_path);

  const { error: dbErr } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);
  if (dbErr) {
    logError(dbErr, {
      route: "products/images-actions:delete",
      scope: "route",
      tags: { stage: "delete-row" },
    });
    return { ok: false, message: dbErr.message };
  }

  if (!isExternal) {
    const { error: removeErr } = await supabase.storage
      .from("product-images")
      .remove([existing.storage_path]);
    if (removeErr) {
      // Storage cleanup is best-effort: the row is gone, the orphan
      // file is harmless. Log so we can clean up later.
      logError(removeErr, {
        route: "products/images-actions:delete",
        scope: "route",
        tags: { stage: "remove-storage" },
      });
    }
  }

  // If we just deleted the primary, promote the next one in sort_order.
  if (existing.is_primary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", existing.product_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      const { error: promoteErr } = await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", next.id);
      if (promoteErr) {
        logError(promoteErr, {
          route: "products/images-actions:delete",
          scope: "route",
          tags: { stage: "promote-next" },
        });
      }
    }
  }

  await notifyRevalidation({ paths: IMAGE_REVALIDATE_PATHS });
  return { ok: true };
}
