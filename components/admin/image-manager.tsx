"use client";

// Admin product image manager.
//
// One control surface for everything an editor can do to a product's
// photos: multi-file upload with optimistic tiles, drag-drop reorder,
// per-tile primary toggle, alt-text editing in both locales, and
// destructive delete with a confirmation prompt.
//
// Architecture notes:
//   • Uploads go through the BROWSER Supabase client using the active
//     admin session (RLS on storage.objects allows admins to write).
//     The matching product_images INSERT is done via a server action
//     so it can re-validate auth and observability fires from the
//     server side.
//   • Reorder, set-primary, alt-edit, delete all flow through server
//     actions. UI updates optimistically and rolls back on action
//     failure (with a banner).
//   • dnd-kit handles the keyboard-accessible drag interaction.

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Star,
  StarOff,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryImageAction,
  updateImageAltAction,
} from "@/app/(admin)/admin/(dashboard)/products/images-actions";
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
} from "@/app/(admin)/admin/(dashboard)/products/images-config";
import { cn } from "@/lib/utils";

const BUCKET = "product-images";
const MAX_FILE_BYTES = MAX_IMAGE_BYTES;
const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);
const ACCEPT_ATTR = ALLOWED_IMAGE_MIME.join(",");

export type AdminImageRow = {
  id: string;
  storage_path: string;
  alt_ka: string;
  alt_en: string;
  sort_order: number;
  is_primary: boolean;
};

type LocalImage = AdminImageRow & {
  /**
   * Lifecycle of the tile from the user's perspective:
   *   - "saved": persisted in the database (real id from server)
   *   - "uploading": file is uploading to Storage, tile is optimistic
   *   - "error": upload or save failed, retry is available
   */
  status: "saved" | "uploading" | "error";
  uploadError?: string;
};

type Props = {
  productId: string;
  initialImages: AdminImageRow[];
};

function tempId(): string {
  // Local-only ids for in-flight uploads. Server-side ids are uuids;
  // we deliberately use a non-uuid prefix so client code can tell
  // optimistic tiles apart from saved ones.
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function resolvePublicUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path.replace(
    /^\/+/,
    ""
  )}`;
}

function fileExt(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
  return /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
}

function bytesToHuman(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

export function ImageManager({ productId, initialImages }: Props) {
  const router = useRouter();
  const [images, setImages] = useState<LocalImage[]>(() =>
    initialImages
      .slice()
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.sort_order - b.sort_order;
      })
      .map((img) => ({ ...img, status: "saved" as const }))
  );
  const [banner, setBanner] = useState<
    { kind: "error" | "warning"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleCount = useMemo(
    () => images.filter((i) => i.status !== "error").length,
    [images]
  );
  const remainingSlots = MAX_IMAGES_PER_PRODUCT - visibleCount;
  const altMissingCount = useMemo(
    () =>
      images.filter(
        (i) => i.status === "saved" && (!i.alt_ka.trim() || !i.alt_en.trim())
      ).length,
    [images]
  );

  // ---- Upload ----------------------------------------------------------

  const handleFiles = useCallback(
    async (files: FileList) => {
      setBanner(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        if (!ALLOWED_MIME.has(file.type)) {
          errors.push(`${file.name}: unsupported type (${file.type || "?"})`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          errors.push(
            `${file.name}: ${bytesToHuman(file.size)} exceeds 10MB cap`
          );
          continue;
        }
        valid.push(file);
      }

      if (valid.length === 0) {
        if (errors.length > 0) {
          setBanner({ kind: "error", text: errors.join("\n") });
        }
        return;
      }

      const accepted = valid.slice(0, Math.max(0, remainingSlots));
      const dropped = valid.length - accepted.length;
      if (dropped > 0) {
        errors.push(
          `${dropped} image${dropped === 1 ? "" : "s"} skipped (limit ${MAX_IMAGES_PER_PRODUCT} per product).`
        );
      }
      if (accepted.length === 0) {
        setBanner({ kind: "error", text: errors.join("\n") });
        return;
      }
      if (errors.length > 0) {
        setBanner({ kind: "warning", text: errors.join("\n") });
      }

      // Build optimistic tiles before the network round-trip so the UI
      // shows progress immediately.
      const tiles: LocalImage[] = accepted.map((file, idx) => ({
        id: tempId(),
        storage_path: "",
        alt_ka: "",
        alt_en: "",
        sort_order: images.length + idx,
        is_primary: false,
        status: "uploading" as const,
        uploadError: undefined,
      }));
      // Track each tile's source File alongside the tile so we can
      // upload sequentially without re-mapping later.
      const queue = tiles.map((tile, idx) => ({
        tile,
        file: accepted[idx]!,
      }));
      setImages((prev) => [...prev, ...tiles]);

      const supabase = createSupabaseBrowserClient();

      startTransition(async () => {
        for (const { tile, file } of queue) {
          const ext = fileExt(file.name);
          const path = `products/${productId}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });

          if (uploadErr) {
            setImages((prev) =>
              prev.map((i) =>
                i.id === tile.id
                  ? { ...i, status: "error", uploadError: uploadErr.message }
                  : i
              )
            );
            setBanner({
              kind: "error",
              text: `Upload failed: ${file.name}: ${uploadErr.message}`,
            });
            continue;
          }

          const result = await addProductImageAction({
            product_id: productId,
            storage_path: path,
          });
          if (!result.ok) {
            setImages((prev) =>
              prev.map((i) =>
                i.id === tile.id
                  ? {
                      ...i,
                      status: "error",
                      uploadError: result.message ?? "Save failed",
                    }
                  : i
              )
            );
            setBanner({
              kind: "error",
              text: result.message ?? "Failed to save image record.",
            });
            // Best-effort cleanup of the orphan storage object.
            await supabase.storage.from(BUCKET).remove([path]);
            continue;
          }

          // Replace the optimistic tile with what the server now has.
          // We need the real id, sort_order, is_primary — refresh the
          // route so the next render rehydrates from authoritative data.
          setImages((prev) =>
            prev.map((i) =>
              i.id === tile.id
                ? { ...i, status: "saved", storage_path: path }
                : i
            )
          );
        }

        // After the batch, refresh so server state replaces our
        // optimistic ids with real ones (server assigned id, primary
        // flag if this was the first image, etc.).
        router.refresh();
      });
    },
    [images.length, productId, remainingSlots, router]
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    void handleFiles(event.target.files);
    event.target.value = "";
  };

  // ---- Reorder ---------------------------------------------------------

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Only reorder among saved tiles. Optimistic tiles can't be
      // persisted yet anyway.
      const savedIds = images
        .filter((i) => i.status === "saved")
        .map((i) => i.id);
      const oldIdx = savedIds.indexOf(String(active.id));
      const newIdx = savedIds.indexOf(String(over.id));
      if (oldIdx < 0 || newIdx < 0) return;

      const nextSavedIds = arrayMove(savedIds, oldIdx, newIdx);
      const previousImages = images;
      const reordered = images
        .slice()
        .sort((a, b) => {
          if (a.status !== "saved" && b.status !== "saved") return 0;
          if (a.status !== "saved") return 1;
          if (b.status !== "saved") return -1;
          return nextSavedIds.indexOf(a.id) - nextSavedIds.indexOf(b.id);
        });
      setImages(reordered);

      startTransition(async () => {
        const result = await reorderProductImagesAction({
          product_id: productId,
          ordered_ids: nextSavedIds,
        });
        if (!result.ok) {
          setImages(previousImages);
          setBanner({
            kind: "error",
            text: result.message ?? "Reorder failed.",
          });
        } else {
          router.refresh();
        }
      });
    },
    [images, productId, router]
  );

  // ---- Set primary ----------------------------------------------------

  const handleSetPrimary = useCallback(
    (imageId: string) => {
      const previousImages = images;
      setImages((prev) =>
        prev.map((i) => ({ ...i, is_primary: i.id === imageId }))
      );

      startTransition(async () => {
        const result = await setPrimaryImageAction(imageId);
        if (!result.ok) {
          setImages(previousImages);
          setBanner({
            kind: "error",
            text: result.message ?? "Could not set primary image.",
          });
        } else {
          router.refresh();
        }
      });
    },
    [images, router]
  );

  // ---- Delete ---------------------------------------------------------

  const handleDelete = useCallback(
    (imageId: string) => {
      if (
        !window.confirm(
          "Delete image? This cannot be undone."
        )
      ) {
        return;
      }
      const previousImages = images;
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      startTransition(async () => {
        const result = await deleteProductImageAction(imageId);
        if (!result.ok) {
          setImages(previousImages);
          setBanner({
            kind: "error",
            text: result.message ?? "Delete failed.",
          });
        } else {
          router.refresh();
        }
      });
    },
    [images, router]
  );

  // ---- Alt edit -------------------------------------------------------

  const handleAltBlur = useCallback(
    (imageId: string, field: "alt_ka" | "alt_en", value: string) => {
      const original = images.find((i) => i.id === imageId);
      if (!original) return;
      if (original[field] === value) return;

      // Optimistic local change.
      setImages((prev) =>
        prev.map((i) => (i.id === imageId ? { ...i, [field]: value } : i))
      );

      startTransition(async () => {
        const next = {
          alt_ka: field === "alt_ka" ? value : original.alt_ka,
          alt_en: field === "alt_en" ? value : original.alt_en,
        };
        const result = await updateImageAltAction({
          image_id: imageId,
          alt_ka: next.alt_ka,
          alt_en: next.alt_en,
        });
        if (!result.ok) {
          // Revert just the changed field.
          setImages((prev) =>
            prev.map((i) =>
              i.id === imageId ? { ...i, [field]: original[field] } : i
            )
          );
          setBanner({
            kind: "error",
            text: result.message ?? "Failed to save alt text.",
          });
        }
      });
    },
    [images]
  );

  // ---- Render ---------------------------------------------------------

  // Saved + optimistic tiles render in the same grid; we only allow
  // dragging the saved ones (dnd-kit sortable items list).
  const sortableIds = images
    .filter((i) => i.status === "saved")
    .map((i) => i.id);

  // Auto-clear warning banners after 8s; keep error banners until
  // explicit dismissal.
  useEffect(() => {
    if (!banner) return;
    if (banner.kind === "error") return;
    const t = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <div>
      {/* Banner (errors and warnings stacked at the top) */}
      {banner ? (
        <div
          role={banner.kind === "error" ? "alert" : "status"}
          className={cn(
            "mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
            banner.kind === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800"
          )}
        >
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {banner.text}
          </pre>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-auto text-xs underline-offset-2 hover:underline"
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Heads-up about missing alt text. Non-blocking; the editor can
          still save. Clears as soon as both locales are populated for
          every image. */}
      {altMissingCount > 0 ? (
        <p className="mb-4 text-xs text-muted-foreground">
          {altMissingCount} image{altMissingCount === 1 ? "" : "s"} missing
          alt text. Alt text helps accessibility and SEO — fill it in below.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {images.map((img) => (
              <ImageTile
                key={img.id}
                image={img}
                disabled={pending}
                onSetPrimary={handleSetPrimary}
                onDelete={handleDelete}
                onAltBlur={handleAltBlur}
              />
            ))}

            {/* Add-images tile. Reused for empty state too — when
                there are no saved tiles, this dashed box is the only
                thing in the grid. */}
            {remainingSlots > 0 ? (
              <li>
                <label className="flex h-full min-h-[12rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring">
                  <Upload aria-hidden className="h-5 w-5" />
                  <span>{pending ? "Working…" : "Add images"}</span>
                  <span className="text-xs">
                    {remainingSlots} slot{remainingSlots === 1 ? "" : "s"}{" "}
                    left · max {bytesToHuman(MAX_FILE_BYTES)} each
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_ATTR}
                    multiple
                    onChange={onFileChange}
                    disabled={pending}
                    className="sr-only"
                  />
                </label>
              </li>
            ) : (
              <li className="flex h-full min-h-[12rem] items-center justify-center rounded-lg border border-border bg-muted px-4 text-center text-xs text-muted-foreground">
                Maximum {MAX_IMAGES_PER_PRODUCT} images reached.
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageTile — one card in the grid. Sortable for saved tiles; static
// for optimistic / error tiles (cannot be reordered before they're
// persisted).
// ---------------------------------------------------------------------------

type TileProps = {
  image: LocalImage;
  disabled: boolean;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  onAltBlur: (id: string, field: "alt_ka" | "alt_en", value: string) => void;
};

function ImageTile({
  image,
  disabled,
  onSetPrimary,
  onDelete,
  onAltBlur,
}: TileProps) {
  const sortable = useSortable({
    id: image.id,
    disabled: image.status !== "saved",
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const previewUrl = image.storage_path
    ? resolvePublicUrl(image.storage_path)
    : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-background",
        image.status === "error"
          ? "border-destructive/40"
          : "border-border"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={image.alt_en || image.alt_ka || "Product image"}
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}

        {image.is_primary ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
            <Star aria-hidden className="h-3 w-3 fill-current" />
            Primary
          </span>
        ) : null}

        {image.status === "uploading" ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          >
            <Loader2
              aria-hidden
              className="h-5 w-5 animate-spin text-foreground"
            />
            <span className="sr-only">Uploading…</span>
          </div>
        ) : null}

        {image.status === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 px-3 text-center text-xs text-destructive"
          >
            <AlertCircle aria-hidden className="h-4 w-4" />
            <span>Upload failed</span>
            {image.uploadError ? (
              <span className="line-clamp-2 opacity-80">
                {image.uploadError}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Drag handle — only meaningful for saved tiles. */}
        {image.status === "saved" ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label="Reorder image"
            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-background/95 text-foreground/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-grab active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 p-3">
        <div className="grid gap-1">
          <label
            htmlFor={`alt-ka-${image.id}`}
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Alt (ka)
          </label>
          <input
            id={`alt-ka-${image.id}`}
            type="text"
            defaultValue={image.alt_ka}
            disabled={image.status !== "saved" || disabled}
            onBlur={(e) => onAltBlur(image.id, "alt_ka", e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
            maxLength={500}
          />
        </div>
        <div className="grid gap-1">
          <label
            htmlFor={`alt-en-${image.id}`}
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Alt (en)
          </label>
          <input
            id={`alt-en-${image.id}`}
            type="text"
            defaultValue={image.alt_en}
            disabled={image.status !== "saved" || disabled}
            onBlur={(e) => onAltBlur(image.id, "alt_en", e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
            maxLength={500}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {image.is_primary ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <StarOff aria-hidden className="h-3.5 w-3.5" />
              Currently primary
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetPrimary(image.id)}
              disabled={image.status !== "saved" || disabled}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              <Star aria-hidden className="h-3.5 w-3.5" />
              Set primary
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(image.id)}
            disabled={image.status === "uploading" || disabled}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
            aria-label="Delete image"
          >
            <Trash2 aria-hidden className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
