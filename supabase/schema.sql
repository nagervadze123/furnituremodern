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
-- (Comment these out in production once data exists.)
DROP TABLE IF EXISTS public.product_images CASCADE;
DROP TABLE IF EXISTS public.products       CASCADE;
DROP TABLE IF EXISTS public.categories     CASCADE;
DROP TABLE IF EXISTS public.redirects      CASCADE;
DROP TABLE IF EXISTS public.admin_users    CASCADE;

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
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx       ON public.products (category_id);
CREATE INDEX products_is_published_idx      ON public.products (is_published);
CREATE INDEX products_is_featured_idx       ON public.products (is_featured);
CREATE INDEX products_sort_order_idx        ON public.products (sort_order);

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
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
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
