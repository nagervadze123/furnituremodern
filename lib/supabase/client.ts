// Browser-side Supabase client.
//
// Use from "use client" components for things like the admin login
// form. Reads the publishable anon key, which is safe to ship to
// the browser. RLS is enforced by Postgres so this client can only
// see what the active session is allowed to see.

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "./database.types";

/**
 * Create a Supabase client for use in browser components.
 *
 * The factory returns a fresh client on each call so each consumer
 * can manage its own subscriptions/auth flow without leaking state.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
