-- ---------------------------------------------------------------------------
-- categories.image_url — per-category hero photo
-- ---------------------------------------------------------------------------
-- Phase 5 Task 5 redesigns the home page with an asymmetric "featured
-- categories" strip. Today the strip falls back to a hardcoded
-- per-category stock filename in components/sections/featured-categories.tsx.
-- This column lets the operator override that fallback per category from
-- /admin/categories: paste a Supabase Storage path (e.g.
-- "stock/sofa-linen-cream-001.jpg") and the home strip will render it.
--
-- NULL means "use the code fallback" — backwards-compatible with every
-- existing row and with categories created via the offline TS catalog.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text NULL;
