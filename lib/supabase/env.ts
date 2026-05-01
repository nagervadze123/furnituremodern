// Centralized Supabase env-var access.
//
// Why a wrapper file instead of reading process.env inline?
//   1. One place to apply naming conventions and defaults.
//   2. `isSupabaseConfigured()` lets the data layer fall back to local
//      TS content when the env vars are missing, so `npm run build`
//      keeps working in offline development.

/** Public anon URL — safe to expose to the browser. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Public anon key — safe to expose to the browser. */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Service role key. Bypasses RLS. NEVER import this from a client
 * component or any file that ships to the browser. The `admin` client
 * is the only consumer.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * True when the public Supabase env vars are set. Used by the data
 * layer to decide whether to query Supabase or fall back to the local
 * TS catalog. Note: only checks the public vars — service-role-only
 * features will additionally need SUPABASE_SERVICE_ROLE_KEY.
 */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
