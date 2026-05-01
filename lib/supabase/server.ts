// Server-side Supabase client used inside React Server Components,
// route handlers, and server actions.
//
// Critical: this client must read and write cookies via Next.js's
// `cookies()` helper so that the user's auth session is shared across
// browser ↔ server boundaries. @supabase/ssr handles the wire format;
// we just hand it the request's cookie store.

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "./database.types";

/**
 * Create a Supabase client scoped to the current server request.
 *
 * Returns a fresh client per request because the cookie store is
 * request-bound. Reading the active user looks like:
 *
 *   const supabase = await createSupabaseServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      // @supabase/ssr expects bulk get + setAll. The setAll path is
      // wrapped in try/catch because Server Components are not allowed
      // to write cookies — only Route Handlers and Server Actions are.
      // The library calls setAll defensively; ignoring the error keeps
      // RSC reads working without crashing the request.
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookies cannot be written from a Server Component context.
          // Refresh middleware (proxy.ts) is responsible for keeping
          // the session fresh, so dropping the write here is safe.
        }
      },
    },
  });
}
