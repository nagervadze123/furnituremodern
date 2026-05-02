-- ---------------------------------------------------------------------------
-- 2026-05-02 — Slug system production-grade
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • psql "$DATABASE_URL" -f supabase/migrations/2026-05-02-slug-system.sql
--
-- Every statement is idempotent so the migration can be re-run.
--
-- This file upgrades a database that pre-dates 2026-05-02. Projects
-- bootstrapped from the current supabase/schema.sql already include
-- everything below — applying this migration on top is a safe no-op
-- but unnecessary.
--
-- Depends on private.is_admin(), which supabase/schema.sql provisions
-- on first install. Run schema.sql before this migration on any database
-- that does not yet have the helper.
-- ---------------------------------------------------------------------------

-- 1. products.deleted_at  (soft delete)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS products_deleted_at_idx
  ON public.products (deleted_at)
  WHERE deleted_at IS NULL;

-- 2. redirects: allow 410 status_code
ALTER TABLE public.redirects DROP CONSTRAINT IF EXISTS redirects_status_code_check;
ALTER TABLE public.redirects
  ADD CONSTRAINT redirects_status_code_check
  CHECK (status_code IN (301, 302, 307, 308, 410));

-- 3. product_slug_history
CREATE TABLE IF NOT EXISTS public.product_slug_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_slug    text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_slug_history_product_id_idx
  ON public.product_slug_history (product_id);

CREATE INDEX IF NOT EXISTS product_slug_history_changed_at_idx
  ON public.product_slug_history (changed_at DESC);

ALTER TABLE public.product_slug_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_slug_history_admin_select" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_select"
ON public.product_slug_history FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "product_slug_history_admin_insert" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_insert"
ON public.product_slug_history FOR INSERT
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "product_slug_history_admin_delete" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_delete"
ON public.product_slug_history FOR DELETE
USING (private.is_admin());
-- No public read; the dashboard queries via the service-role admin client.
-- No update policy — history rows are immutable after insert.

-- 4. not_found_log
CREATE TABLE IF NOT EXISTS public.not_found_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path         text NOT NULL,
  locale       text NULL,
  referrer     text NULL,
  ip_hash      text NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS not_found_log_path_idx
  ON public.not_found_log (path);

CREATE INDEX IF NOT EXISTS not_found_log_occurred_at_idx
  ON public.not_found_log (occurred_at DESC);

ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "not_found_log_admin_select" ON public.not_found_log;
CREATE POLICY "not_found_log_admin_select"
ON public.not_found_log FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "not_found_log_anon_insert" ON public.not_found_log;
CREATE POLICY "not_found_log_anon_insert"
ON public.not_found_log FOR INSERT
WITH CHECK (true);
-- Anon insert is intentional: the /api/log-404 route writes via the
-- server client (service role) but if anon SELECT were ever needed
-- that's where the lockdown lives. Keep insert open so the API route
-- doesn't need elevated keys; the route hashes the IP before insert.

DROP POLICY IF EXISTS "not_found_log_admin_delete" ON public.not_found_log;
CREATE POLICY "not_found_log_admin_delete"
ON public.not_found_log FOR DELETE
USING (private.is_admin());
