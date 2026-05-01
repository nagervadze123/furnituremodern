// Admin auth helpers — used by both server actions and route guards.
//
// Two pieces:
//   1. `getAuthenticatedAdmin()` — verifies the active session is for a
//      user with a row in `admin_users`. Used at the start of every
//      server action that mutates data, so a tampered cookie cannot
//      bypass the proxy guard.
//   2. `requireAdmin()` — throws on missing/invalid auth. Use this from
//      server actions and admin RSC pages. The proxy is the first line
//      of defense; this is the second.

import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AdminContext = {
  userId: string;
  email: string | null;
  role: "admin" | "editor";
};

/**
 * Returns the active admin context, or null if the request is not from
 * a known admin. Never throws — call this when you want to render
 * different UI based on auth state.
 */
export async function getAuthenticatedAdmin(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();

  // getUser() validates the JWT against Supabase Auth. Do NOT use
  // getSession() here — it reads the cookie locally and skips
  // server-side validation.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return null;

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (adminError || !adminRow) return null;

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    role: (adminRow.role as "admin" | "editor") ?? "editor",
  };
}

/**
 * Asserts the request is from an admin; otherwise redirects to login.
 * Use in admin RSC pages and at the start of server actions.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAuthenticatedAdmin();
  if (!ctx) redirect("/admin/login");
  return ctx;
}
