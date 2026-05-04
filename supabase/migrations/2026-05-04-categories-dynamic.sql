-- Phase 5 Task 3: make categories fully Supabase-driven.
--
-- Adds the columns the public site needs to render an arbitrary set of
-- categories (no more hardcoded list in lib/site-config.ts):
--   • intro_ka / intro_en      — long-form 80–120 word category page hero copy
--   • is_featured_in_nav       — controls top-nav inclusion (max 5 enforced in admin)
--   • is_deleted / deleted_at  — soft-delete; the public route returns 404
--                                without orphaning the products that still
--                                reference the row by id.
--
-- Plus a category_slug_history table mirroring product_slug_history so
-- the admin's slug-rename flow can audit changes and the redirects table
-- keeps old URLs alive.
--
-- Idempotent: every ADD COLUMN uses IF NOT EXISTS, every CREATE uses
-- IF NOT EXISTS, and the policy creates DROP IF EXISTS first. Safe to
-- re-apply.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS intro_ka            text    NOT NULL DEFAULT '';
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS intro_en            text    NOT NULL DEFAULT '';
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_featured_in_nav  boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_deleted          boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz NULL;

-- Partial indexes — categories are a small set, but the queries we
-- run are filtered ones (`is_deleted = false`, `is_featured_in_nav =
-- true`), so partial indexes are the lightest helper for future scale.
CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON public.categories (sort_order, created_at)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS categories_featured_nav_idx
  ON public.categories (sort_order)
  WHERE is_featured_in_nav = true AND is_deleted = false;

-- Backfill: every existing row should appear in the nav by default so
-- the live site does not lose its top-bar links the instant the
-- migration applies. Operator can untoggle in the admin afterwards.
UPDATE public.categories
SET is_featured_in_nav = true
WHERE is_featured_in_nav = false;

-- Backfill: long-form intros for the seeded sofas / bedrooms /
-- tables-chairs categories. Copy was previously in
-- content/category-intros.ts. Skipped for any other slug (operator
-- fills new categories' intros via the admin form).
UPDATE public.categories
SET intro_ka = $$ჩვენი დივნების კოლექცია შექმნილია ყოველდღიური ცხოვრებისთვის, არა ფოტოსესიებისთვის. ჩარჩოები არის ნახარშავი მუხის ხისგან, ფუძე იყენებს 8-მხრივი ხელით შეკრულ ზამბარებს, ხოლო ყოველ ბალიშს აქვს ცალკე ფუმფულას ფენა. შესამოსი მოსახსნელი და ცვლადია — ესე იგი ათი წლის შემდეგაც შეგიძლიათ შეცვალოთ ქსოვილი დივნის ჩარჩოს გადაგდების გარეშე. აირჩიეთ კომპაქტურ ორადგილიან, კომფორტულ სამადგილიან, მოდულურ კუთხის ან ტყავის დღიურ დივანს შორის.$$,
    intro_en = $$Our sofa collection is built for daily living, not photo shoots. Frames are kiln-dried solid oak, suspension uses 8-way hand-tied springs, and every cushion has a separate down-and-feather core inside a moisture-wicking ticking. Covers are removable, dry-cleanable, and replaceable — so the sofa you buy today can be reupholstered in a different fabric ten years from now without throwing away the structure. Choose from compact two-seaters, generous three-seaters, modular corner systems, and a full-grain leather daybed.$$
WHERE slug = 'sofas' AND (intro_ka = '' OR intro_en = '');

UPDATE public.categories
SET intro_ka = $$საძინებლის კოლექცია ფოკუსირებულია იმ ნივთებზე, რომლებიც ნამდვილად გჭირდებათ: დაბალი პლატფორმის საწოლი, ფართო კომოდი, ვიწრო გარდერობი და გვერდითი ნივთები — საწოლის გვერდითი მაგიდები, საწოლის ბოლოს სკამი. ჩარჩოები არის თეთრი მუხა ან ევროპული კაკალი, ტრადიციული შეერთებებით — დროთა განმავლობაში ისინი მკაცრდებიან, არ დუნდებიან. უჯრები გადის სრული გაშლის სარბენებზე; გარდერობს აქვს ჩამოსაკიდი, ორი რეგულირებადი თარო და ფეხსაცმლის სპეციალური თარო ფსკერზე.$$,
    intro_en = $$The bedroom collection focuses on the pieces you actually need: a low platform bed, a roomy dresser, a generous wardrobe, and the small companions — bedside tables, an end-of-bed bench. Frames are solid white oak or European walnut, joined with traditional mortise-and-tenon construction so they get tighter, not looser, with age. Drawers run on full-extension soft-close runners; wardrobe interiors include a hanging rail, two adjustable shelves, and a dedicated shoe shelf at the base.$$
WHERE slug = 'bedrooms' AND (intro_ka = '' OR intro_en = '');

UPDATE public.categories
SET intro_ka = $$მაგიდები და სკამები არის ის ნივთები, რომლებსაც ოჯახი ყველაზე ხშირად იყენებს, ამიტომ მათ ყველაზე ფრთხილად ვამზადებთ. სასადილო მაგიდები იწარმოება ბუნებრივი მუხისგან ან კაკლისგან; მრგვალი ფუძის ვერსია ეტევა ოთხს, ოთხკუთხა — ექვსს. ვიშბოუნ ზურგით სკამები იყენებენ ორთქლით მოღუნულ მუხის ჩარჩოებს და ხელით ნაქსოვ ქაღალდის თოკის დასაჯდომებს — ორივე მასალა დროთა განმავლობაში უფრო კომფორტული ხდება. ასევე გვაქვს სამუშაო მაგიდა, დაბალი ყავის მაგიდა და უზურგო ბარული სკამი.$$,
    intro_en = $$Tables and chairs are the pieces a household uses most, so we make them the most carefully. Dining tables come in solid oak or walnut; the round pedestal version sits four, the rectangular six. Wishbone-back dining chairs use steam-bent oak frames and hand-woven paper-cord seats — both materials get more comfortable as they soften with use. We also offer a writing desk, a low coffee table, and a backless counter stool sized for kitchen islands.$$
WHERE slug = 'tables-chairs' AND (intro_ka = '' OR intro_en = '');

-- ---------------------------------------------------------------------------
-- category_slug_history — append-only audit of slug renames.
-- ---------------------------------------------------------------------------
-- Mirrors product_slug_history. Inserted by the admin category update
-- action whenever a slug rewrites. Used by the SEO dashboard to flag
-- orphan redirect chains.
CREATE TABLE IF NOT EXISTS public.category_slug_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  old_slug    text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS category_slug_history_category_id_idx
  ON public.category_slug_history (category_id);
CREATE INDEX IF NOT EXISTS category_slug_history_changed_at_idx
  ON public.category_slug_history (changed_at DESC);

ALTER TABLE public.category_slug_history ENABLE ROW LEVEL SECURITY;

-- Admin-only — same shape as product_slug_history.
DROP POLICY IF EXISTS "category_slug_history_admin_select"
  ON public.category_slug_history;
CREATE POLICY "category_slug_history_admin_select"
ON public.category_slug_history FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "category_slug_history_admin_insert"
  ON public.category_slug_history;
CREATE POLICY "category_slug_history_admin_insert"
ON public.category_slug_history FOR INSERT
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "category_slug_history_admin_delete"
  ON public.category_slug_history;
CREATE POLICY "category_slug_history_admin_delete"
ON public.category_slug_history FOR DELETE
USING (private.is_admin());
