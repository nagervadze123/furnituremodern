// Cookie-less Supabase client for **public** server-side reads.
//
// Why a separate client: the cookie-aware `createSupabaseServerClient()`
// calls `cookies()` from `next/headers`, which throws when invoked
// outside a request context — including inside `generateStaticParams`
// at build time. For tables whose RLS allows public/anon reads
// (`categories`, published `products` + `product_images`, `redirects`),
// we never need the user's session, so we can skip the cookie store
// entirely.
//
// This client uses the anon key only and runs as the `anon` role,
// so the same RLS policies still apply.

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null = null;

export function createSupabasePublicClient() {
  if (!cached) {
    cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Stateless — no session storage, no token refresh, no cookies.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cached;
}
