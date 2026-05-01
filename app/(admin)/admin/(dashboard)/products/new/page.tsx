// /admin/products/new — empty form for creating a product.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductForm, type CategoryOption } from "@/components/admin/product-form";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const supabase = createSupabaseAdminClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .order("sort_order", { ascending: true });

  const categories = (cats ?? []) as CategoryOption[];
  const defaultCategoryId = categories[0]?.id ?? "";

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to products
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        New product
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Save as a draft first, then publish once the content is reviewed.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-background p-6">
        <ProductForm
          action={createProductAction}
          submitLabel="Create product"
          categories={categories}
          defaults={{
            slug: "",
            category_id: defaultCategoryId,
            name_ka: "",
            name_en: "",
            description_ka: "",
            description_en: "",
            price: 0,
            is_featured: false,
            is_published: false,
            sort_order: 0,
          }}
        />
      </div>
    </div>
  );
}
