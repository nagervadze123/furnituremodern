-- ---------------------------------------------------------------------------
-- product_images attribution columns
-- ---------------------------------------------------------------------------
-- Phase 5 Task 4 swaps picsum.photos placeholders for curated stock
-- photography from Unsplash + Pexels. Both services permit commercial
-- use without required attribution, but the operator should KNOW which
-- rows are stock placeholders vs. real product photos so they can be
-- replaced first when real photography arrives.
--
-- Three nullable columns:
--   • source       — 'unsplash' | 'pexels' | NULL (NULL means operator-uploaded)
--   • source_url   — the human-readable photo page on the source site
--   • photographer — the credited photographer name from the source
--
-- All three are NULL on real product photos — admins ignore them.
-- All three are populated on stock placeholders — surfaced in the admin
-- image manager so the operator sees "stock from Unsplash by X" beside
-- each placeholder image.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS source       text NULL,
  ADD COLUMN IF NOT EXISTS source_url   text NULL,
  ADD COLUMN IF NOT EXISTS photographer text NULL;

-- Restrict source values once the column exists. CHECK is added separately
-- so the ADD COLUMN above stays IF-NOT-EXISTS-friendly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_images_source_check'
      AND conrelid = 'public.product_images'::regclass
  ) THEN
    ALTER TABLE public.product_images
      ADD CONSTRAINT product_images_source_check
      CHECK (source IS NULL OR source IN ('unsplash', 'pexels'));
  END IF;
END $$;

-- Index lets the admin filter "show only stock placeholders" cheaply
-- when the operator wants a list of rows that need real photography.
CREATE INDEX IF NOT EXISTS product_images_source_idx
  ON public.product_images (source)
  WHERE source IS NOT NULL;
