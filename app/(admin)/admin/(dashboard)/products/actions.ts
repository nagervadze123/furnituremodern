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

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/admin/schemas";
import { isValidSlug } from "@/lib/slug";
import { detectSlugConflicts } from "@/lib/admin/slug-conflicts";
import { notifyRevalidation, type PathSpec } from "@/lib/revalidation/notify";
import { submitIndexNow, productUrls } from "@/lib/seo/indexnow";
import { absoluteUrl } from "@/lib/site-config";

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
 * 5-minute ISR window. Routes through notifyRevalidation() so peer
 * deployments (Vercel ↔ localhost) also drop their cache.
 */
async function revalidatePublicSurfaces(category?: string, slug?: string) {
  const paths: PathSpec[] = [
    { path: "/", type: "page" },
    { path: "/sitemap.xml", type: "page" },
  ];
  if (category) {
    paths.push({ path: `/[locale]/[category]`, type: "page" });
  }
  if (category && slug) {
    paths.push({ path: `/[locale]/[category]/[slug]`, type: "page" });
  }
  await notifyRevalidation({ paths });
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
  await revalidatePublicSurfaces(created.categories?.slug, created.slug);

  // Best-effort IndexNow ping when the new product is published. Fire
  // and forget — submitIndexNow is bounded by an internal 5s timeout
  // and never throws. Skip when unpublished (URL is not yet public).
  if (parsed.is_published && created.categories?.slug) {
    void submitIndexNow(productUrls(created.categories.slug, created.slug));
  }

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
  const admin = await requireAdmin();

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

  // Append-only audit row whenever the slug actually changed. Done
  // before the redirect upsert so a partial failure leaves history
  // present without redirects (we can replay the redirects), rather
  // than the inverse (redirects pointing at slugs we have no record of).
  if (next.slug !== prev.slug) {
    await supabase.from("product_slug_history").insert({
      product_id: productId,
      old_slug: prev.slug,
      changed_by: admin.userId,
    });
  }

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

  await revalidatePublicSurfaces(next.categories?.slug, next.slug);
  // Also revalidate the OLD URL so any cached version returns 301.
  if (next.slug !== prev.slug) {
    await revalidatePublicSurfaces(prev.categories.slug, prev.slug);
  }

  // Best-effort IndexNow ping. Submit the new canonical URLs always,
  // and the old URLs too when the slug or category moved — telling
  // engines to re-crawl the old paths is what accelerates discovery
  // of the 301 redirect we just wrote.
  const newCat = next.categories?.slug;
  if (parsed.is_published && newCat) {
    const urls = productUrls(newCat, next.slug);
    const slugChanged = next.slug !== prev.slug;
    const categoryChanged = newCat !== prev.categories.slug;
    if (slugChanged || categoryChanged) {
      urls.push(...productUrls(prev.categories.slug, prev.slug));
    }
    void submitIndexNow(urls);
  }

  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Soft delete (with redirect-or-410 choice)
// ---------------------------------------------------------------------------
// Hard-delete is no longer exposed. The product row stays in the
// database with `deleted_at` set, public reads filter it out, and the
// admin chooses between two outcomes for visitors landing on the old
// URL: 301 to the category, or 410 Gone (Plan 2 Task 7 wires the 410
// handler).

export type DeleteMode = "redirect" | "gone";

export async function softDeleteProductAction(
  productId: string,
  mode: DeleteMode
): Promise<ActionState> {
  await requireAdmin();
  if (!productId) return { ok: false, message: "Missing product id." };

  const supabase = createSupabaseAdminClient();

  // Fetch the row so we know what URL to wire up afterwards.
  const { data: existing } = await supabase
    .from("products")
    .select("slug, categories ( slug )")
    .eq("id", productId)
    .single();
  if (!existing) return { ok: false, message: "Product not found." };

  const row = existing as unknown as {
    slug: string;
    categories: { slug: string } | null;
  };

  // 1. Mark deleted.
  const { error: updateErr } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId);
  if (updateErr) return { ok: false, message: updateErr.message };

  // 2. Wire up either a 301 redirect to the category page or a 410.
  // Failure here matters: without these rows the old URL serves a hard
  // 404, so we surface upsert errors back to the admin instead of
  // silently redirecting with `?deleted=1`. The product row is already
  // soft-deleted at this point — re-running the action recovers.
  const cat = row.categories?.slug ?? "";
  if (!cat) {
    // Defensive: should never happen given the FK, but the read cast
    // admits null. Log and keep going — the soft-delete still took.
    console.warn(
      "[softDeleteProductAction] product %s has no category; skipping redirects",
      productId
    );
  } else {
    const status = mode === "gone" ? (410 as const) : (301 as const);
    // When status is 410, `to_path` is ignored at lookup time (the
    // proxy rewrites to /<locale>/gone); we still set it to the category
    // page because the column is NOT NULL. Don't trust `to_path` for 410.
    const rows = (["ka", "en"] as const).map((loc) => ({
      from_path: `/${loc}/${cat}/${row.slug}`,
      to_path: `/${loc}/${cat}`,
      status_code: status,
    }));
    const { error: redirectErr } = await supabase
      .from("redirects")
      .upsert(rows, { onConflict: "from_path", ignoreDuplicates: false });
    if (redirectErr) {
      return {
        ok: false,
        message: `Soft-deleted, but failed to wire up redirects: ${redirectErr.message}. Re-run delete to retry.`,
      };
    }
  }

  await revalidatePublicSurfaces(cat || undefined, row.slug);

  // Best-effort IndexNow ping. Submit the now-redirected/410'd URLs
  // so engines re-crawl them, see the new status, and either follow
  // the 301 to the category or de-index the page.
  if (cat) {
    const urls = productUrls(cat, row.slug);
    if (mode === "redirect") {
      // For 301 mode, also nudge the destination category so engines
      // re-crawl it and see the inbound link equity reroute.
      urls.push(absoluteUrl(`/ka/${cat}`), absoluteUrl(`/en/${cat}`));
    }
    void submitIndexNow(urls);
  }

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
