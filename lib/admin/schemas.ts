// Zod input schemas. Used by both the admin server actions and the
// /admin/login form. Centralized here so the validation rules cannot
// drift between the form (client-side, optional) and the action
// (server-side, mandatory).

import { z } from "zod";
import { isValidSlug } from "@/lib/slug";

// Categories are FULLY DB-driven (Phase 5 Task 3). The public site
// renders any active row from the `categories` table — there's no
// hardcoded slug list anywhere. The admin form below only validates
// shape (kebab-case ASCII, length, required bilingual copy); the
// caller is responsible for catching slug collisions against existing
// rows via `lib/admin/slug-conflicts.ts`.

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
  is_new: z.coerce.boolean().default(false),
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
    .refine(isValidSlug, "Slug must be lowercase, dash-separated ASCII"),
  name_ka: z.string().min(1, "Georgian name is required").max(200),
  name_en: z.string().min(1, "English name is required").max(200),
  description_ka: z.string().max(2000).default(""),
  description_en: z.string().max(2000).default(""),
  // 80–120 word hero paragraph per locale. Optional in the schema so
  // admin can ship a row with name + tagline first and fill the long
  // copy later, but the public page falls back to the tagline if intro
  // is empty (see lib/data/categories.ts).
  intro_ka: z.string().max(4000).default(""),
  intro_en: z.string().max(4000).default(""),
  sort_order: z.coerce.number().int().default(0),
  // Boolean checkbox; coerce. The action enforces the max-5 cap by
  // counting other rows that already have this flag on.
  is_featured_in_nav: z.coerce.boolean().default(false),
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
