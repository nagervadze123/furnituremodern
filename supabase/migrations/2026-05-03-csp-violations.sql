-- ---------------------------------------------------------------------------
-- 2026-05-03 — CSP violations
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • psql "$DATABASE_URL" -f supabase/migrations/2026-05-03-csp-violations.sql
--   • Supabase MCP apply_migration
--
-- Every statement is idempotent so the migration can be re-run safely.
--
-- Depends on private.is_admin(), which supabase/schema.sql provisions on
-- first install. Run schema.sql before this migration on any database
-- that does not yet have the helper.
--
-- Phase 4 Task 3 ships a Content-Security-Policy-Report-Only header that
-- tightens style-src to nonce-only. Browsers POST violation reports to
-- /api/csp-report; the route handler forwards them to Sentry AND inserts
-- a row here for persistent admin review (Sentry retention is short, the
-- Supabase row gives us a 1-month rolling window admins can query).
--
-- Security model — same as analytics_event / web_vitals:
--   • RLS is enabled.
--   • There is NO anon/authenticated INSERT policy. The /api/csp-report
--     route uses createSupabaseAdminClient() (service role bypasses RLS),
--     so anon PostgREST clients can't write directly.
--   • Admin SELECT for the dashboard, admin DELETE for retention sweeps.
--
-- We deliberately store ip_hash (not raw IP) and skip user_agent — CSP
-- reports come from real users hitting real pages, and a violation report
-- is enough signal on its own. The browser may include `source-file`,
-- `line-number`, and `column-number` in the report; we keep them as text
-- so the admin tile can group violations by location without indexing
-- each numeric field separately.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.csp_violations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Header that fired the report. Kept so we can tell enforced
  -- violations apart from report-only telemetry once both are emitted.
  disposition        text NOT NULL CHECK (disposition IN ('enforce','report')),
  -- Document the violation happened on (path-only; query strings are
  -- stripped at insert time to avoid leaking session-bearing URLs).
  document_uri       text NOT NULL,
  -- Page that linked to or referred the violating document, if any.
  referrer           text NULL,
  -- The directive that was violated, e.g. "style-src" or
  -- "style-src-elem". This is the prefix browsers report; we store
  -- the full effective-directive too in `effective_directive` when
  -- the browser provides it.
  violated_directive text NOT NULL,
  effective_directive text NULL,
  -- The CSP string that was active when the violation fired. Useful
  -- for diagnosing which deploy/CSP shape produced the report.
  original_policy    text NULL,
  -- The URL or scheme of the resource that got blocked. Browser
  -- extensions show up as `chrome-extension://...` here; the route
  -- filters those out before insert (see app/api/csp-report/route.ts).
  blocked_uri        text NULL,
  -- Where in the page the violation fired. `script-sample` is a tiny
  -- excerpt some browsers attach for inline-script violations; we
  -- capture it for parity with what Sentry receives.
  source_file        text NULL,
  line_number        integer NULL,
  column_number      integer NULL,
  script_sample      text NULL,
  status_code        integer NULL,
  -- Hashed client IP, same FNV-1a 32-bit pattern used by
  -- not_found_log and analytics_event. Lets admins group reports
  -- without storing identifying data.
  ip_hash            text NULL,
  occurred_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS csp_violations_directive_idx
  ON public.csp_violations (violated_directive);
CREATE INDEX IF NOT EXISTS csp_violations_document_uri_idx
  ON public.csp_violations (document_uri);
CREATE INDEX IF NOT EXISTS csp_violations_occurred_at_idx
  ON public.csp_violations (occurred_at DESC);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csp_violations_admin_select" ON public.csp_violations;
CREATE POLICY "csp_violations_admin_select"
ON public.csp_violations FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "csp_violations_admin_delete" ON public.csp_violations;
CREATE POLICY "csp_violations_admin_delete"
ON public.csp_violations FOR DELETE
USING (private.is_admin());

-- No INSERT policy. Service-role writes via the /api/csp-report route
-- handler. Anon/authenticated clients are blocked at the RLS layer.
