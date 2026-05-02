// Server actions for product CRUD.
//
// All mutations:
//   1. require an authenticated admin (defense in depth — the proxy
//      already gates the page; this catches misconfigured cases),
//   2. validate input with Zod,
//   3. write through the service-role admin client (bypasses RLS) so
//      the same code works regardless of which role the dashboard is
//      using,
//   4. revalidate any public page that depends on the data.
//
// On slug change, an entry is automatically inserted into the
// `redirects` table mapping the old URL → new URL (per the spec).

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/admin/schemas";
import { isValidSlug } from "@/lib/slug";
import { detectSlugConflicts } from "@/lib/admin/slug-conflicts";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Convert FormData to a plain object Zod can parse.
function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    obj[key] = value;
  });
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

/**
 * Revalidate every public surface that could be displaying a product.
 * Called after every mutation so visitors see fresh data without the
 * 5-minute ISR window.
 */
function revalidatePublicSurfaces(category?: string, slug?: string) {
  // Home page (uses featured products).
  revalidatePath("/", "page");
  // Category landing pages.
  if (category) {
    revalidatePath(`/[locale]/[category]`, "page");
  }
  // Specific product detail page.
  if (category && slug) {
    revalidatePath(`/[locale]/[category]/[slug]`, "page");
  }
  // Sitemap.
  revalidatePath("/sitemap.xml", "page");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  let parsed;
  try {
    parsed = productSchema.parse(formToObject(formData));
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

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", parsed.category_id)
    .single();

  if (!category) {
    return {
      ok: false,
      message: "Category not found.",
      fieldErrors: { category_id: "Category not found" },
    };
  }

  const conflict = await detectSlugConflicts({
    supabase,
    slug: parsed.slug,
    categorySlug: category.slug,
    excludeProductId: null,
  });
  if (!conflict.ok) {
    return {
      ok: false,
      message: conflict.message_ka,
      fieldErrors: { slug: conflict.message_ka },
    };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: parsed.slug,
      category_id: parsed.category_id,
      name_ka: parsed.name_ka,
      name_en: parsed.name_en,
      description_ka: parsed.description_ka,
      description_en: parsed.description_en,
      price: parsed.price,
      currency: parsed.currency,
      is_featured: parsed.is_featured,
      is_published: parsed.is_published,
      sort_order: parsed.sort_order,
    })
    .select("id, slug, categories ( slug )")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Failed to create product.",
    };
  }

  // Look up the category slug for revalidation paths.
  const created = data as unknown as {
    id: string;
    slug: string;
    categories: { slug: string } | null;
  };
  revalidatePublicSurfaces(created.categories?.slug, created.slug);

  // Redirect throws — must come AFTER all DB work.
  redirect(`/admin/products/${created.id}/edit?created=1`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export async function updateProductAction(
  productId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  let parsed;
  try {
    parsed = productSchema.parse(formToObject(formData));
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

  // Fetch the existing row to detect slug or category changes.
  const { data: existing, error: fetchErr } = await supabase
    .from("products")
    .select("id, slug, category_id, categories!inner ( slug )")
    .eq("id", productId)
    .single();

  if (fetchErr || !existing) {
    return { ok: false, message: "Product not found." };
  }
  const prev = existing as unknown as {
    id: string;
    slug: string;
    category_id: string;
    categories: { slug: string };
  };

  // Reuse prev's category slug unless the form moved the product to a
  // different category — saves a round-trip on the common in-place edit.
  let nextCategorySlug = prev.categories.slug;
  if (parsed.category_id !== prev.category_id) {
    const { data: nextCategory } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", parsed.category_id)
      .single();
    if (!nextCategory) {
      return {
        ok: false,
        message: "Category not found.",
        fieldErrors: { category_id: "Category not found" },
      };
    }
    nextCategorySlug = nextCategory.slug;
  }

  const conflict = await detectSlugConflicts({
    supabase,
    slug: parsed.slug,
    categorySlug: nextCategorySlug,
    excludeProductId: productId,
  });
  if (!conflict.ok) {
    return {
      ok: false,
      message: conflict.message_ka,
      fieldErrors: { slug: conflict.message_ka },
    };
  }

  // Update the row.
  const { data: updated, error: updateErr } = await supabase
    .from("products")
    .update({
      slug: parsed.slug,
      category_id: parsed.category_id,
      name_ka: parsed.name_ka,
      name_en: parsed.name_en,
      description_ka: parsed.description_ka,
      description_en: parsed.description_en,
      price: parsed.price,
      currency: parsed.currency,
      is_featured: parsed.is_featured,
      is_published: parsed.is_published,
      sort_order: parsed.sort_order,
    })
    .eq("id", productId)
    .select("slug, categories ( slug )")
    .single();

  if (updateErr || !updated) {
    return {
      ok: false,
      message: updateErr?.message ?? "Failed to update product.",
    };
  }

  const next = updated as unknown as {
    slug: string;
    categories: { slug: string } | null;
  };

  // If the slug or category changed, write 301 redirects so old URLs
  // still resolve. We add ONE redirect per locale because URLs are
  // locale-prefixed.
  if (
    next.slug !== prev.slug ||
    next.categories?.slug !== prev.categories.slug
  ) {
    const oldCat = prev.categories.slug;
    const newCat = next.categories?.slug ?? oldCat;
    const locales = ["ka", "en"] as const;
    const rows = locales.map((loc) => ({
      from_path: `/${loc}/${oldCat}/${prev.slug}`,
      to_path: `/${loc}/${newCat}/${next.slug}`,
      status_code: 301,
    }));
    // upsert so re-saving the same slug doesn't fail on the unique constraint.
    await supabase
      .from("redirects")
      .upsert(rows, { onConflict: "from_path", ignoreDuplicates: false });
  }

  revalidatePublicSurfaces(next.categories?.slug, next.slug);
  // Also revalidate the OLD URL so any cached version returns 301.
  if (next.slug !== prev.slug) {
    revalidatePublicSurfaces(prev.categories.slug, prev.slug);
  }

  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
export async function deleteProductAction(
  productId: string
): Promise<ActionState> {
  await requireAdmin();

  if (!productId) return { ok: false, message: "Missing product id." };

  const supabase = createSupabaseAdminClient();

  // Fetch first so we know what to revalidate.
  const { data: existing } = await supabase
    .from("products")
    .select("slug, categories ( slug )")
    .eq("id", productId)
    .single();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) return { ok: false, message: error.message };

  const row = existing as unknown as {
    slug: string;
    categories: { slug: string } | null;
  } | null;
  revalidatePublicSurfaces(row?.categories?.slug, row?.slug);

  redirect("/admin/products?deleted=1");
}

// ---------------------------------------------------------------------------
// Slug helper, callable from the form
// ---------------------------------------------------------------------------
/**
 * Suggest a slug given the English name. Exported as a server action
 * so the form can call it without round-tripping through an API route.
 * The suggestion is just a hint — admins can override.
 */
export async function suggestSlugAction(name: string): Promise<string> {
  const { slugify } = await import("@/lib/slug");
  const out = slugify(name);
  return isValidSlug(out) ? out : "";
}
