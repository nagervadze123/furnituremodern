-- ---------------------------------------------------------------------------
-- 2026-05-02 — web_vitals schema extension + p75 dashboard view
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • psql "$DATABASE_URL" -f supabase/migrations/2026-05-02-web-vitals-extend.sql
--   • Supabase MCP apply_migration
--
-- Every statement is idempotent.
--
-- Adds two columns the /api/vitals route handler stores:
--   • device_type — bucketed from User-Agent server-side ("mobile" |
--     "tablet" | "desktop"). 3 buckets only, no fingerprinting.
--   • effective_connection_type — when the browser exposes
--     navigator.connection.effectiveType ("4g" / "3g" / etc.). Many
--     privacy-restricted browsers omit this; it's nullable.
--
-- The previously-shipped columns ip_hash and user_agent stay in place
-- (dropping them would not be backwards-compatible) but the route
-- handler never inserts into them — the privacy contract is no IP
-- and no raw UA persisted. They remain available if a future task
-- needs them with a stricter privacy review.
--
-- Adds a SECURITY INVOKER view used by /admin's RUM tile:
--   web_vitals_p75_7d — one row per metric over the last 7 days, with
--   p75, sample count, and last-occurred timestamp.
-- ---------------------------------------------------------------------------

ALTER TABLE public.web_vitals
  ADD COLUMN IF NOT EXISTS device_type text NULL;

ALTER TABLE public.web_vitals
  ADD COLUMN IF NOT EXISTS effective_connection_type text NULL;

-- Bucket constraint on device_type. Idempotent: drop existing constraint
-- (if any prior version of this migration created it) before re-adding.
ALTER TABLE public.web_vitals DROP CONSTRAINT IF EXISTS web_vitals_device_type_check;
ALTER TABLE public.web_vitals
  ADD CONSTRAINT web_vitals_device_type_check
  CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop'));

-- ---------------------------------------------------------------------------
-- web_vitals_p75_7d — admin dashboard aggregate view.
-- ---------------------------------------------------------------------------
-- One row per metric over the last 7 days. PERCENTILE_CONT is the
-- continuous interpolation variant — appropriate for time-series
-- numerics where exact rank matching isn't required.
--
-- The view is SECURITY INVOKER (the default), so it inherits the
-- caller's permissions. Combined with web_vitals's RLS policy
-- (admin-only SELECT), only the admin client can read it. The route
-- handler doesn't read this view — only /admin does.
CREATE OR REPLACE VIEW public.web_vitals_p75_7d
WITH (security_invoker = true) AS
SELECT
  metric,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value)::numeric AS p75,
  COUNT(*)::bigint AS samples,
  MAX(occurred_at) AS last_occurred_at
FROM public.web_vitals
WHERE occurred_at >= now() - interval '7 days'
GROUP BY metric;

COMMENT ON VIEW public.web_vitals_p75_7d IS
  'Admin RUM tile aggregate. One row per metric over the last 7 days: p75, sample count, last-seen timestamp. SECURITY INVOKER + admin-only RLS on web_vitals means only the service-role/admin client can read.';
