-- ---------------------------------------------------------------------------
-- 2026-05-02 — Analytics + RUM
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • psql "$DATABASE_URL" -f supabase/migrations/2026-05-02-analytics-rum.sql
--   • Supabase MCP apply_migration
--
-- Every statement is idempotent so the migration can be re-run safely.
--
-- Depends on private.is_admin(), which supabase/schema.sql provisions on
-- first install. Run schema.sql before this migration on any database
-- that does not yet have the helper.
--
-- Security model — different from public read/admin write tables:
--   • RLS is enabled on both tables.
--   • There is NO anon/authenticated INSERT policy. Service-role bypasses
--     RLS, so writes flow through the server-side route handlers
--     (/api/analytics, /api/vitals) which use createSupabaseAdminClient().
--     Anon clients (browser fetches against PostgREST) get blocked.
--   • Admin SELECT for the dashboard, admin DELETE for retention sweeps.
-- ---------------------------------------------------------------------------

-- 1. analytics_event — first-party event log.
CREATE TABLE IF NOT EXISTS public.analytics_event (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event        text NOT NULL,
  path         text NOT NULL,
  locale       text NULL,
  referrer     text NULL,
  ip_hash      text NULL,
  user_agent   text NULL,
  props        jsonb NOT NULL DEFAULT '{}',
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_event_event_idx
  ON public.analytics_event (event);
CREATE INDEX IF NOT EXISTS analytics_event_path_idx
  ON public.analytics_event (path);
CREATE INDEX IF NOT EXISTS analytics_event_occurred_at_idx
  ON public.analytics_event (occurred_at DESC);

ALTER TABLE public.analytics_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_event_admin_select" ON public.analytics_event;
CREATE POLICY "analytics_event_admin_select"
ON public.analytics_event FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "analytics_event_admin_delete" ON public.analytics_event;
CREATE POLICY "analytics_event_admin_delete"
ON public.analytics_event FOR DELETE
USING (private.is_admin());

-- Drop the legacy anon-insert policy if a previous draft of this migration
-- created it. Service-role-only writes are now the contract; the route
-- handler uses createSupabaseAdminClient() and bypasses RLS.
DROP POLICY IF EXISTS "analytics_event_anon_insert" ON public.analytics_event;

-- 2. web_vitals — Real User Monitoring metrics (LCP, INP, CLS, FCP, TTFB).
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric          text NOT NULL CHECK (metric IN ('CLS','INP','LCP','FCP','TTFB')),
  value           numeric NOT NULL,
  rating          text NOT NULL CHECK (rating IN ('good','needs-improvement','poor')),
  path            text NOT NULL,
  locale          text NULL,
  navigation_type text NULL,
  ip_hash         text NULL,
  user_agent      text NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_metric_idx
  ON public.web_vitals (metric);
CREATE INDEX IF NOT EXISTS web_vitals_path_idx
  ON public.web_vitals (path);
CREATE INDEX IF NOT EXISTS web_vitals_occurred_at_idx
  ON public.web_vitals (occurred_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_vitals_admin_select" ON public.web_vitals;
CREATE POLICY "web_vitals_admin_select"
ON public.web_vitals FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "web_vitals_admin_delete" ON public.web_vitals;
CREATE POLICY "web_vitals_admin_delete"
ON public.web_vitals FOR DELETE
USING (private.is_admin());

-- Same legacy policy cleanup as above.
DROP POLICY IF EXISTS "web_vitals_anon_insert" ON public.web_vitals;
