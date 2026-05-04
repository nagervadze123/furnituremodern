// Constants and types shared between the product-image server actions
// and the client-side ImageManager component.
//
// Pulled out of `images-actions.ts` because that file carries the
// `"use server"` directive — Next 16 treats every export from such a
// file as a server action, so non-function exports (constants, types)
// must live elsewhere.

/** Maximum number of images permitted on a single product. */
export const MAX_IMAGES_PER_PRODUCT = 12;

/** Per-image upload size cap (bytes). 10MB. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** MIME types the admin uploader accepts. */
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ImageActionResult = { ok: boolean; message?: string };
