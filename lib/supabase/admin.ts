// Service-role Supabase client. Bypasses RLS.
//
// DANGER: this client uses the service role key. NEVER import it
// from any file that ships to the browser. Use it only from:
//   - admin-only server actions
//   - cron jobs / background jobs running server-side
//   - the `seed.sql` runner if you ever script it
//
// The `import "server-only"` directive makes the build fail loudly if
// a client component ever pulls this in.

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";
import type { Database } from "./database.types";

/**
 * Lazily build a singleton service-role client.
 *
 * Lazy because `process.env.SUPABASE_SERVICE_ROLE_KEY` is not always
 * set in offline development; constructing the client at import time
 * would crash every page that even transitively imports this module.
 */
let cached: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin client requested without NEXT_PUBLIC_SUPABASE_URL " +
        "or SUPABASE_SERVICE_ROLE_KEY. Set both in your server environment " +
        "before calling admin operations."
    );
  }

  if (!cached) {
    cached = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        // No persistent session — this is server-side and stateless.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cached;
}
