// /admin/products/[id]/edit — edit form + delete + image management.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ProductForm,
  type CategoryOption,
} from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import {
  updateProductAction,
  softDeleteProductAction,
  type ActionState,
} from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = createSupabaseAdminClient();
  const [productResult, categoriesResult, imagesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, category_id, name_ka, name_en, description_ka, description_en, price, currency, is_featured, is_new, is_published, sort_order"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("categories")
      .select("id, slug, name_en")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_images")
      .select(
        "id, storage_path, alt_ka, alt_en, sort_order, is_primary, source, source_url, photographer"
      )
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (productResult.error || !productResult.data) notFound();

  const product = productResult.data as {
    id: string;
    slug: string;
    category_id: string;
    name_ka: string;
    name_en: string;
    description_ka: string;
    description_en: string;
    price: number | string;
    currency: string;
    is_featured: boolean;
    is_new: boolean;
    is_published: boolean;
    sort_order: number;
  };
  const categories = (categoriesResult.data ?? []) as CategoryOption[];
  const images = imagesResult.data ?? [];

  // Bind the productId argument to make the action signature match
  // the form's (prev, formData) shape.
  const boundUpdate = updateProductAction.bind(null, product.id) as (
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;

  // Bind productId; the button supplies the mode at click time.
  const boundDelete = softDeleteProductAction.bind(null, product.id);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit product
        </h1>
        <DeleteProductButton action={boundDelete} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Public URL:{" "}
        <code className="font-mono text-xs">/[locale]/[category]/{product.slug}</code>
      </p>

      {created ? (
        <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          Product created. You can now upload images below.
        </p>
      ) : null}

      <div className="mt-8 rounded-xl border border-border bg-background p-6">
        <ProductForm
          action={boundUpdate}
          submitLabel="Save changes"
          categories={categories}
          defaults={{
            id: product.id,
            slug: product.slug,
            category_id: product.category_id,
            name_ka: product.name_ka,
            name_en: product.name_en,
            description_ka: product.description_ka,
            description_en: product.description_en,
            price: product.price,
            is_featured: product.is_featured,
            is_new: product.is_new,
            is_published: product.is_published,
            sort_order: product.sort_order,
          }}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold tracking-tight">Images</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload product photos, drag to reorder, choose a primary image,
          and add bilingual alt text. Up to 12 images per product.
        </p>
        <div className="mt-4">
          <ImageManager productId={product.id} initialImages={images} />
        </div>
      </div>
    </div>
  );
}
