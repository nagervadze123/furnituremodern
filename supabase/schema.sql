-- ---------------------------------------------------------------------------
-- ⚠️  BOOTSTRAP-ONLY FILE — DOES NOT REPLACE MIGRATIONS
-- ---------------------------------------------------------------------------
-- This file recreates the entire database schema from scratch.
-- It contains DROP TABLE statements that WILL DESTROY ALL DATA
-- if executed against a database that contains real records.
--
-- USE FOR:
--   ✅ Initialize a fresh, empty Supabase project for the first time
--   ✅ Reset a local development database during testing
--   ✅ Reference the canonical schema shape for code review
--
-- DO NOT USE FOR:
--   ❌ Applying changes to production
--   ❌ Applying changes to any database with real data
--   ❌ Syncing dev → prod schema differences
--
-- For schema changes against existing databases, write an idempotent
-- migration in supabase/migrations/YYYY-MM-DD-description.sql and apply
-- it via the Supabase MCP apply_migration tool or the Supabase CLI.
--
-- This file is regenerated whenever migrations change; treat it as a
-- derived artifact, not the source of truth.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Runtime guard — refuses to run against a populated database.
-- ---------------------------------------------------------------------------
-- Belt-and-braces protection in case someone pastes this file into the
-- SQL editor of a project that already has data. Fires before the first
-- DROP, so nothing has been destroyed yet when the EXCEPTION is raised.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    IF (SELECT count(*) FROM public.products) > 0 THEN
      RAISE EXCEPTION 'Refusing to run bootstrap schema.sql against a database that already contains data. Use migrations instead. See file header for guidance.';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Furnituremodern — Postgres schema (Supabase)
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • supabase db query < supabase/schema.sql
--   • psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Then run supabase/seed.sql to populate the tables with the Phase 1
-- placeholder content so the site renders the same as the offline build.
--
-- Security model:
--   • RLS is enabled on every table in the public schema.
--   • Public reads are limited to rows where is_published = true.
--   • Writes (insert/update/delete) require an entry in admin_users.
--   • The admin_users table itself is readable only to admins.
--   • Storage bucket policies are defined at the bottom of the file.
-- ---------------------------------------------------------------------------

-- Always start fresh — drop in dependency order if you re-run the file.
-- The DO-block guard above will RAISE EXCEPTION if products already
-- contains rows, so these DROP statements only execute against an
-- empty database.
DROP TABLE IF EXISTS public.product_images       CASCADE;
DROP TABLE IF EXISTS public.product_slug_history CASCADE;
DROP TABLE IF EXISTS public.products             CASCADE;
DROP TABLE IF EXISTS public.categories           CASCADE;
DROP TABLE IF EXISTS public.redirects            CASCADE;
DROP TABLE IF EXISTS public.not_found_log        CASCADE;
DROP TABLE IF EXISTS public.web_vitals           CASCADE;
DROP TABLE IF EXISTS public.analytics_event      CASCADE;
DROP TABLE IF EXISTS public.csp_violations       CASCADE;
DROP TABLE IF EXISTS public.admin_users          CASCADE;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name_ka       text NOT NULL,
  name_en       text NOT NULL,
  description_ka text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_sort_order_idx ON public.categories (sort_order);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  category_id   uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name_ka       text NOT NULL,
  name_en       text NOT NULL,
  description_ka text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  price         numeric(10, 2) NOT NULL CHECK (price >= 0),
  currency      text NOT NULL DEFAULT 'GEL',
  is_featured   boolean NOT NULL DEFAULT false,
  is_published  boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL
);

CREATE INDEX products_category_id_idx       ON public.products (category_id);
CREATE INDEX products_is_published_idx      ON public.products (is_published);
CREATE INDEX products_is_featured_idx       ON public.products (is_featured);
CREATE INDEX products_sort_order_idx        ON public.products (sort_order);
CREATE INDEX products_deleted_at_idx        ON public.products (deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at on every row change. search_path is locked
-- because the body is schema-qualifier-free; pg_catalog is always on
-- the path so now() resolves cleanly.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
-- Stores Supabase Storage paths (NOT public URLs). The data layer
-- resolves storage_path → public URL using getPublicUrl() at read time.
CREATE TABLE public.product_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,        -- e.g. "products/<product-id>/<file>.jpg"
  alt_ka       text NOT NULL DEFAULT '',
  alt_en       text NOT NULL DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx ON public.product_images (product_id);
CREATE INDEX product_images_sort_order_idx ON public.product_images (sort_order);

-- Only one primary image per product. Use a partial unique index so
-- non-primary rows do not collide.
CREATE UNIQUE INDEX product_images_one_primary_per_product
  ON public.product_images (product_id)
  WHERE is_primary = true;

-- ---------------------------------------------------------------------------
-- product_slug_history
-- ---------------------------------------------------------------------------
-- Append-only audit trail of slug changes. Inserted by the admin product
-- update action whenever a slug is rewritten. Used by the SEO dashboard
-- to flag orphaned redirect chains.
CREATE TABLE public.product_slug_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_slug    text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX product_slug_history_product_id_idx ON public.product_slug_history (product_id);
CREATE INDEX product_slug_history_changed_at_idx ON public.product_slug_history (changed_at DESC);

-- ---------------------------------------------------------------------------
-- not_found_log
-- ---------------------------------------------------------------------------
-- 404 telemetry. The not-found boundary fires a beacon to /api/log-404
-- which inserts here. IP is hashed (FNV-1a) before insert.
CREATE TABLE public.not_found_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path         text NOT NULL,
  locale       text NULL,
  referrer     text NULL,
  ip_hash      text NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX not_found_log_path_idx        ON public.not_found_log (path);
CREATE INDEX not_found_log_occurred_at_idx ON public.not_found_log (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
-- Maps an authenticated Supabase user to an admin role. RLS policies on
-- the other tables look this table up via a SECURITY DEFINER helper
-- (see private.is_admin() below — kept out of the public schema so it
-- cannot be called via the Data API).
CREATE TABLE public.admin_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- redirects
-- ---------------------------------------------------------------------------
-- 301-redirect table looked up by the proxy. Used to keep old URLs
-- working when a slug changes — the admin product-edit form inserts
-- into this table automatically.
CREATE TABLE public.redirects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   text UNIQUE NOT NULL,    -- e.g. "/ka/sofas/old-slug"
  to_path     text NOT NULL,           -- e.g. "/ka/sofas/new-slug"
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308, 410)),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX redirects_from_path_idx ON public.redirects (from_path);

-- ---------------------------------------------------------------------------
-- is_admin() helper
-- ---------------------------------------------------------------------------
-- Lives in a `private` schema that is NOT in the Supabase Data API's
-- exposed schema list. SECURITY DEFINER lets RLS policies read
-- admin_users without having to grant SELECT on it to every role.
-- search_path is locked to '' (empty) so the body cannot be hijacked
-- by a transient search_path override; every reference inside is
-- fully schema-qualified.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- RLS policies run as the calling role (anon / authenticated), so they
-- need EXECUTE on the function. The body still runs as the function
-- owner thanks to SECURITY DEFINER.
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Policy structure note:
--   We explicitly avoid `FOR ALL` on tables that already have a public
--   SELECT policy. Otherwise Postgres treats the FOR ALL policy as an
--   additional permissive SELECT and evaluates BOTH on every read,
--   which the Supabase advisor flags as `multiple_permissive_policies`.
--   Splitting writes into per-action policies (INSERT / UPDATE / DELETE)
--   keeps SELECT clean.

-- categories: readable by anyone; writable only by admins.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "categories_admin_insert"
ON public.categories FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "categories_admin_update"
ON public.categories FOR UPDATE
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "categories_admin_delete"
ON public.categories FOR DELETE
USING (private.is_admin());

-- products: a single SELECT policy that covers both audiences:
--   • public can see rows where is_published = true
--   • admins can see everything
-- Combining the two into one OR'd USING clause avoids the cost of
-- evaluating two permissive SELECT policies per row.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select"
ON public.products FOR SELECT
USING (is_published = true OR private.is_admin());

CREATE POLICY "products_admin_insert"
ON public.products FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "products_admin_update"
ON public.products FOR UPDATE
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "products_admin_delete"
ON public.products FOR DELETE
USING (private.is_admin());

-- product_images: same merged-SELECT pattern. Public can read images
-- of published products; admins can read images of any product.
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select"
ON public.product_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND (p.is_published = true OR private.is_admin())
  )
);

CREATE POLICY "product_images_admin_insert"
ON public.product_images FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "product_images_admin_update"
ON public.product_images FOR UPDATE
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "product_images_admin_delete"
ON public.product_images FOR DELETE
USING (private.is_admin());

-- admin_users: SELECT restricted to admins; writes also admins-only.
-- (Bootstrap row is inserted via the service-role key, which bypasses RLS.)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_admin_only"
ON public.admin_users FOR SELECT
USING (private.is_admin());

CREATE POLICY "admin_users_admin_insert"
ON public.admin_users FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "admin_users_admin_update"
ON public.admin_users FOR UPDATE
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "admin_users_admin_delete"
ON public.admin_users FOR DELETE
USING (private.is_admin());

-- redirects: anyone can read (the proxy looks them up on every request
-- via the anon key); only admins can write.
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redirects_public_read"
ON public.redirects FOR SELECT
USING (true);

CREATE POLICY "redirects_admin_insert"
ON public.redirects FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "redirects_admin_update"
ON public.redirects FOR UPDATE
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "redirects_admin_delete"
ON public.redirects FOR DELETE
USING (private.is_admin());

-- product_slug_history: admin-only. No public read; the SEO dashboard
-- queries it via the service-role admin client. No update policy —
-- history rows are immutable after insert.
ALTER TABLE public.product_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_slug_history_admin_select"
ON public.product_slug_history FOR SELECT
USING (private.is_admin());

CREATE POLICY "product_slug_history_admin_insert"
ON public.product_slug_history FOR INSERT
WITH CHECK (private.is_admin());

CREATE POLICY "product_slug_history_admin_delete"
ON public.product_slug_history FOR DELETE
USING (private.is_admin());

-- not_found_log: admin reads + deletes; insert is open so the public
-- /api/log-404 beacon can write without elevated keys. The route hashes
-- the IP before insert so no PII lands in the row.
ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "not_found_log_admin_select"
ON public.not_found_log FOR SELECT
USING (private.is_admin());

CREATE POLICY "not_found_log_anon_insert"
ON public.not_found_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "not_found_log_admin_delete"
ON public.not_found_log FOR DELETE
USING (private.is_admin());

-- ---------------------------------------------------------------------------
-- analytics_event — first-party event log.
-- ---------------------------------------------------------------------------
-- RLS is enabled and there is NO anon/authenticated INSERT policy: the
-- /api/analytics route handler uses createSupabaseAdminClient() (service
-- role bypasses RLS), so anon clients hitting PostgREST can't write.
-- Admin reads + deletes only — no public SELECT exposes event rows.
CREATE TABLE public.analytics_event (
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

CREATE INDEX analytics_event_event_idx
  ON public.analytics_event (event);
CREATE INDEX analytics_event_path_idx
  ON public.analytics_event (path);
CREATE INDEX analytics_event_occurred_at_idx
  ON public.analytics_event (occurred_at DESC);

ALTER TABLE public.analytics_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_event_admin_select"
ON public.analytics_event FOR SELECT
USING (private.is_admin());

CREATE POLICY "analytics_event_admin_delete"
ON public.analytics_event FOR DELETE
USING (private.is_admin());

-- ---------------------------------------------------------------------------
-- web_vitals — Real User Monitoring metrics (LCP, INP, CLS, FCP, TTFB).
-- ---------------------------------------------------------------------------
-- Same security shape as analytics_event: RLS on, no anon INSERT,
-- service-role writes via /api/vitals, admin reads for the dashboard.
-- ip_hash + user_agent are kept on the schema for backwards-compat with
-- the original migration but the /api/vitals route handler never inserts
-- into them (privacy contract: no IP and no raw UA persisted). The route
-- bucket-derives device_type from the User-Agent server-side then
-- discards the raw header before insert.
CREATE TABLE public.web_vitals (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric                    text NOT NULL CHECK (metric IN ('CLS','INP','LCP','FCP','TTFB')),
  value                     numeric NOT NULL,
  rating                    text NOT NULL CHECK (rating IN ('good','needs-improvement','poor')),
  path                      text NOT NULL,
  locale                    text NULL,
  navigation_type           text NULL,
  ip_hash                   text NULL,
  user_agent                text NULL,
  device_type               text NULL CHECK (device_type IS NULL OR device_type IN ('mobile','tablet','desktop')),
  effective_connection_type text NULL,
  occurred_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX web_vitals_metric_idx
  ON public.web_vitals (metric);
CREATE INDEX web_vitals_path_idx
  ON public.web_vitals (path);
CREATE INDEX web_vitals_occurred_at_idx
  ON public.web_vitals (occurred_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "web_vitals_admin_select"
ON public.web_vitals FOR SELECT
USING (private.is_admin());

CREATE POLICY "web_vitals_admin_delete"
ON public.web_vitals FOR DELETE
USING (private.is_admin());

-- One-row-per-metric aggregate used by /admin's RUM tile. Continuous
-- p75 over the last 7 days, plus sample count and last-seen timestamp.
-- SECURITY INVOKER + admin-only RLS on web_vitals means anon can't read
-- this view either.
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

-- ---------------------------------------------------------------------------
-- csp_violations — Content-Security-Policy violation reports.
-- ---------------------------------------------------------------------------
-- Phase 4 Task 3 ships a Content-Security-Policy-Report-Only header that
-- tightens style-src to nonce-only. Browsers POST violation reports to
-- /api/csp-report; the route handler forwards them to Sentry AND inserts
-- a row here for persistent admin review (Sentry retention is short, the
-- Supabase row gives us a 1-month rolling window admins can query).
--
-- Same security shape as analytics_event / web_vitals: RLS on, no anon
-- INSERT, service-role writes via /api/csp-report, admin reads + deletes.
-- The route filters chrome-extension:// blocked-uri values out before
-- insert (browser-extension noise, not real attacks).
CREATE TABLE public.csp_violations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disposition         text NOT NULL CHECK (disposition IN ('enforce','report')),
  document_uri        text NOT NULL,
  referrer            text NULL,
  violated_directive  text NOT NULL,
  effective_directive text NULL,
  original_policy     text NULL,
  blocked_uri         text NULL,
  source_file         text NULL,
  line_number         integer NULL,
  column_number       integer NULL,
  script_sample       text NULL,
  status_code         integer NULL,
  ip_hash             text NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX csp_violations_directive_idx
  ON public.csp_violations (violated_directive);
CREATE INDEX csp_violations_document_uri_idx
  ON public.csp_violations (document_uri);
CREATE INDEX csp_violations_occurred_at_idx
  ON public.csp_violations (occurred_at DESC);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csp_violations_admin_select"
ON public.csp_violations FOR SELECT
USING (private.is_admin());

CREATE POLICY "csp_violations_admin_delete"
ON public.csp_violations FOR DELETE
USING (private.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket: product-images
-- ---------------------------------------------------------------------------
-- The bucket is `public = true`, so files are reachable via the public
-- URL pattern (`/storage/v1/object/public/product-images/<path>`)
-- without a SELECT policy on storage.objects. We deliberately do NOT
-- add a public SELECT policy because that would also allow listing
-- every object in the bucket (advisor lint:
-- public_bucket_allows_listing). Object reads through the public URL
-- continue to work; what we block is `LIST` enumeration.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Admins still need SELECT on storage.objects so the admin UI can
-- enumerate uploaded files for a product.
CREATE POLICY "product_images_storage_admin_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images' AND private.is_admin());

-- Admin write (insert + update + delete; upserts need all three).
CREATE POLICY "product_images_storage_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND private.is_admin());

CREATE POLICY "product_images_storage_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND private.is_admin())
WITH CHECK (bucket_id = 'product-images' AND private.is_admin());

CREATE POLICY "product_images_storage_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND private.is_admin());

-- ---------------------------------------------------------------------------
-- Bootstrapping the first admin user
-- ---------------------------------------------------------------------------
-- 1. Create an account in Supabase Auth (via the dashboard or a sign-up flow).
-- 2. Find the user's id in the auth.users table.
-- 3. Run this snippet in the SQL editor (uncomment + replace the email):
--
-- INSERT INTO public.admin_users (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
