// Zod input schemas. Used by both the admin server actions and the
// /admin/login form. Centralized here so the validation rules cannot
// drift between the form (client-side, optional) and the action
// (server-side, mandatory).

import { z } from "zod";
import { isValidSlug } from "@/lib/slug";
import { categories as supportedCategories } from "@/lib/site-config";

// Categories are CODE-DEFINED, not fully DB-defined: the public site
// renders a category only if its slug is enumerated in
// `lib/site-config.ts` AND has editorial copy in
// `content/category-intros.ts`. Admin-created rows whose slug is not
// already supported in code would never be displayed, so we block
// creating them up front rather than silently dropping the row at
// render time. To add a new category: add it to site-config + a copy
// entry in content/category-intros.ts, ship the code, then create the
// row in the admin.
const SUPPORTED_CATEGORY_SLUGS = supportedCategories.map(
  (c) => c.slug
) as readonly string[];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
// Reused for both create and update. Optional fields are validated as
// "if present, must look right".
export const productSchema = z.object({
  // Slug: kebab-case ASCII. Validated separately because the regex
  // matters for SEO and we want a clear error message.
  slug: z
    .string()
    .min(1, { message: "სლაგი სავალდებულოა" })
    .max(80, { message: "სლაგი 80 სიმბოლოზე გრძელია" })
    .refine(isValidSlug, { message: "სლაგი მხოლოდ ASCII ასოებით, ციფრებითა და დეფისებით" }),

  category_id: z.string().uuid("Pick a category"),

  name_ka: z.string().min(1, "Georgian name is required").max(200),
  name_en: z.string().min(1, "English name is required").max(200),

  description_ka: z.string().max(4000).default(""),
  description_en: z.string().max(4000).default(""),

  // Use coerce because <input type="number"> sends strings.
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  currency: z.literal("GEL").default("GEL"),

  // Boolean checkboxes come through as "on" or undefined; coerce.
  is_featured: z.coerce.boolean().default(false),
  is_published: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
});
export type ProductInput = z.infer<typeof productSchema>;

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
export const categorySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .refine(isValidSlug, "Slug must be lowercase, dash-separated ASCII")
    .refine(
      (s) => SUPPORTED_CATEGORY_SLUGS.includes(s),
      `Categories are code-defined: pick one of ${SUPPORTED_CATEGORY_SLUGS.join(
        ", "
      )}. To add a new category, update lib/site-config.ts and content/category-intros.ts first, then create it here.`
    ),
  name_ka: z.string().min(1, "Georgian name is required").max(200),
  name_en: z.string().min(1, "English name is required").max(200),
  description_ka: z.string().max(2000).default(""),
  description_en: z.string().max(2000).default(""),
  sort_order: z.coerce.number().int().default(0),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Redirect
// ---------------------------------------------------------------------------
// Both paths must start with "/" so the proxy comparison is unambiguous.
const pathString = z
  .string()
  .min(1, "Path is required")
  .max(2048)
  .refine((v) => v.startsWith("/"), "Path must start with /");

// Form-submitted status codes arrive as strings (hidden input or <select>),
// while server-side callers may pass numbers directly. Coerce numeric
// strings into numbers, then enforce the allowed-codes whitelist. 410 is
// included because proxy.ts treats it as a "Gone" rewrite.
export const redirectSchema = z.object({
  from_path: pathString,
  to_path: pathString,
  status_code: z
    .preprocess(
      (v) => {
        if (typeof v === "string") {
          const n = Number(v);
          return Number.isFinite(n) ? n : v;
        }
        return v;
      },
      z.union([
        z.literal(301),
        z.literal(302),
        z.literal(307),
        z.literal(308),
        z.literal(410),
      ])
    )
    .default(301),
});
export type RedirectInput = z.infer<typeof redirectSchema>;
