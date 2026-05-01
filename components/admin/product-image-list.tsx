// Image list + uploader for the product edit page.
//
// Uploads run from the BROWSER using the authenticated Supabase
// session. After a successful upload we call a server action to
// insert the matching `product_images` row. Deletes go through
// another server action that also removes the underlying object.

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addProductImageAction,
  deleteProductImageAction,
} from "@/app/(admin)/admin/(dashboard)/products/images-actions";

type ImageRow = {
  id: string;
  storage_path: string;
  alt_ka: string;
  alt_en: string;
  sort_order: number;
  is_primary: boolean;
};

type Props = {
  productId: string;
  initialImages: ImageRow[];
};

const BUCKET = "product-images";

export function ProductImageList({ productId, initialImages }: Props) {
  const [images, setImages] = useState<ImageRow[]>(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
    // Path: products/<id>/<timestamp>.<ext>. Timestamp prevents collisions.
    const storagePath = `products/${productId}/${Date.now()}.${safeExt}`;

    startTransition(async () => {
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });
      if (uploadErr) {
        setError(uploadErr.message);
        return;
      }

      const result = await addProductImageAction({
        product_id: productId,
        storage_path: storagePath,
      });
      if (!result.ok) {
        setError(result.message ?? "Failed to save image record.");
        return;
      }

      // Reset the file input and refresh the page so the server-side
      // image list re-fetches.
      event.target.value = "";
      router.refresh();
      setImages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          storage_path: storagePath,
          alt_ka: "",
          alt_en: "",
          sort_order: prev.length,
          is_primary: prev.length === 0,
        },
      ]);
    });
  };

  const handleDelete = (imageId: string) => {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId);
      if (!result.ok) {
        setError(result.message ?? "Failed to delete image.");
        return;
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      router.refresh();
    });
  };

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => (
          <li
            key={img.id}
            className="group relative overflow-hidden rounded-lg border border-border bg-muted"
          >
            <div className="relative aspect-square">
              <Image
                src={resolveImageUrl(img.storage_path)}
                alt={img.alt_en || img.alt_ka || "Product image"}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover"
              />
              {img.is_primary ? (
                <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium">
                  Primary
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              disabled={pending}
              className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-destructive opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
              aria-label="Delete image"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </li>
        ))}

        <li>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <Upload aria-hidden className="h-5 w-5" />
            {pending ? "Uploading…" : "Add image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={pending}
              className="sr-only"
            />
          </label>
        </li>
      </ul>
    </div>
  );
}

function resolveImageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path.replace(
    /^\/+/,
    ""
  )}`;
}

