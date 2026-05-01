-- ---------------------------------------------------------------------------
-- Furnituremodern — seed data
-- ---------------------------------------------------------------------------
-- Apply AFTER schema.sql:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • supabase db query < supabase/seed.sql
--   • psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Mirrors the placeholder catalog in `content/products.ts` so the
-- Supabase-backed site renders identically to the offline build.
--
-- Image strategy:
--   The `product_images.storage_path` column normally holds a path
--   inside the `product-images` storage bucket (e.g. "products/<id>/01.jpg").
--   In this seed file we store fully-qualified picsum.photos URLs so
--   the site has visible imagery without an upload step. The data
--   layer detects "http(s)://" prefixes and uses them as-is; replace
--   each row with a real storage path once you have real photography.
-- ---------------------------------------------------------------------------

-- Wipe existing rows so re-running the seed is idempotent.
TRUNCATE public.product_images RESTART IDENTITY CASCADE;
TRUNCATE public.products       RESTART IDENTITY CASCADE;
TRUNCATE public.categories     RESTART IDENTITY CASCADE;
TRUNCATE public.redirects      RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Categories (display order matches Phase 1 site-config)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (slug, name_ka, name_en, description_ka, description_en, sort_order) VALUES
  ('sofas',         'დივნები',                      'Sofas',           'მისაღები ოთახის ხანგრძლივი დივნები',          'Living-room seating, built to last',         0),
  ('bedrooms',      'საძინებლები',                  'Bedrooms',        'საწოლები, კომოდები და სანათები',              'Beds, dressers and bedside pieces',          1),
  ('tables-chairs', 'მაგიდები და სკამები',          'Tables & Chairs', 'სასადილო და სამუშაო ნივთები',                  'Dining and workspace pieces',                2);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
-- Helper CTE: look up category UUIDs by slug so the inserts stay readable.
WITH cats AS (
  SELECT id, slug FROM public.categories
)
INSERT INTO public.products (
  slug, category_id, name_ka, name_en, description_ka, description_en,
  price, currency, is_featured, is_published, sort_order
) VALUES
  -- ------- SOFAS -------
  ('linen-three-seater',       (SELECT id FROM cats WHERE slug = 'sofas'),
   'სელის სამადგილიანი დივანი',          'Linen Three-Seater',
   'მოდუნებული სამადგილიანი დივანი ბელგიური სელით და მუხის ფეხებით.',
   'A relaxed three-seater upholstered in heavyweight Belgian linen with solid oak feet.',
   4200, 'GEL', true,  true, 0),
  ('walnut-frame-loveseat',    (SELECT id FROM cats WHERE slug = 'sofas'),
   'კაკლის ჩარჩოიანი ლავსიტი',           'Walnut Frame Loveseat',
   'ორადგილიანი ლავსიტი კაკლის ხილული ჩარჩოთი და მოსახსნელი მატყლის ბალიშებით.',
   'Two-seat loveseat with an exposed solid walnut frame and removable wool covers.',
   3600, 'GEL', false, true, 1),
  ('modular-corner',           (SELECT id FROM cats WHERE slug = 'sofas'),
   'მოდულური კუთხის დივანი',             'Modular Corner Sofa',
   'კონფიგურირებადი კუთხის დივანი ოთხი მოდულით ნებისმიერი ოთახისთვის.',
   'Configurable corner sofa: rearrange the four modules to fit any living room.',
   6800, 'GEL', true,  true, 2),
  ('compact-armchair',         (SELECT id FROM cats WHERE slug = 'sofas'),
   'კომპაქტური სავარძელი',               'Compact Armchair',
   'მაღალი ზურგით და მკაცრი ფორმით სავარძელი — იდეალური მცირე ბინებისთვის.',
   'A reading-height armchair with a tall back and tight tailoring — ideal for small apartments.',
   2100, 'GEL', false, true, 3),
  ('boucle-club-chair',        (SELECT id FROM cats WHERE slug = 'sofas'),
   'ბუკლე კლუბური სკამი',                'Bouclé Club Chair',
   'მრუდი კლუბური სკამი კრემისფერი ბუკლეთი და ხის მბრუნავი ფუძით.',
   'Curved club chair upholstered in cream bouclé with a hardwood swivel base.',
   2800, 'GEL', false, true, 4),
  ('leather-daybed',           (SELECT id FROM cats WHERE slug = 'sofas'),
   'ტყავის დღიური დივანი',               'Leather Daybed',
   'სრული მარცვლის ტყავის დღიური დივანი დაბალი მუხის ფუძით — დივანი დღით, საწოლი ღამით.',
   'Full-grain leather daybed with a low oak base — works as a sofa, naps as a bed.',
   5400, 'GEL', false, true, 5),

  -- ------- BEDROOMS -------
  ('oak-platform-bed',         (SELECT id FROM cats WHERE slug = 'bedrooms'),
   'მუხის პლატფორმის საწოლი',            'Oak Platform Bed',
   'დაბალი პროფილის პლატფორმის საწოლი ბუნებრივი მუხისგან, ნაზად მრუდი ზურგით.',
   'Low-profile platform bed in solid white oak with a softly curved headboard.',
   3900, 'GEL', true,  true, 0),
  ('upholstered-headboard-bed',(SELECT id FROM cats WHERE slug = 'bedrooms'),
   'შემოსილი ზურგით საწოლი',             'Upholstered Headboard Bed',
   'ორმაგი საწოლი ღრმა, კონცხებიანი სელის ზურგით და კაკლის ფეხებით.',
   'Queen-size bed with a deep, channel-tufted linen headboard and walnut legs.',
   4500, 'GEL', false, true, 1),
  ('slatted-walnut-dresser',   (SELECT id FROM cats WHERE slug = 'bedrooms'),
   'ფიცრიანი კაკლის კომოდი',             'Slatted Walnut Dresser',
   'ექვსუჯრიანი კომოდი ვერტიკალური კაკლის ფიცრებით და მშვიდი დახურვის სარბენით.',
   'Six-drawer dresser with vertical walnut slats and soft-close runners.',
   2950, 'GEL', false, true, 2),
  ('round-bedside-table',      (SELECT id FROM cats WHERE slug = 'bedrooms'),
   'მრგვალი საწოლის გვერდითი მაგიდა',    'Round Bedside Table',
   'მცირე მრგვალი საწოლის გვერდითი მაგიდა მუხისგან, ერთი უჯრით და სპილენძის სახელურით.',
   'A small round bedside table in oak with a single drawer and brass pull.',
   950,  'GEL', false, true, 3),
  ('wardrobe-two-door',        (SELECT id FROM cats WHERE slug = 'bedrooms'),
   'ორკარიანი გარდერობი',                'Two-Door Wardrobe',
   'მაღალი ორკარიანი გარდერობი თეთრი მუხისგან, ფეხსაცმლის სპეციალური თაროთი.',
   'Tall two-door wardrobe in white oak with a dedicated shoe shelf at the base.',
   5200, 'GEL', false, true, 4),
  ('bench-end-of-bed',         (SELECT id FROM cats WHERE slug = 'bedrooms'),
   'საწოლის ბოლოს სკამი',                'End-of-Bed Bench',
   'გრძელი შემოსილი სკამი ორმაგი საწოლის ბოლოსთვის.',
   'Long upholstered bench sized to sit at the foot of a queen or king bed.',
   1450, 'GEL', false, true, 5),

  -- ------- TABLES & CHAIRS -------
  ('oak-dining-table-six',     (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'მუხის სასადილო მაგიდა 6-ზე',         'Oak Dining Table, 6-Seat',
   'ბუნებრივი მუხის სასადილო მაგიდა ექვს ადგილზე, ხელით გასუფთავებული ზეთით.',
   'Solid oak dining table for six, with a routed edge and a hand-rubbed oil finish.',
   4800, 'GEL', true,  true, 0),
  ('round-pedestal-table',     (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'მრგვალი ფუძემაგიდა',                 'Round Pedestal Table',
   '110 სმ მრგვალი ფუძემაგიდა კაკლისგან — კომფორტულად ეტევა ოთხი ადამიანი.',
   'A 110 cm round pedestal table in walnut — fits four comfortably in a small kitchen.',
   2900, 'GEL', false, true, 1),
  ('wishbone-dining-chair',    (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'ვიშბოუნ სასადილო სკამი',             'Wishbone Dining Chair',
   'Y-ფორმის ზურგით სასადილო სკამი, ხელით ნაქსოვი დასაჯდომით და მუხის ჩარჩოთი.',
   'Y-back dining chair with a hand-woven paper cord seat and steam-bent oak frame.',
   720,  'GEL', false, true, 2),
  ('writing-desk',             (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'სამუშაო მაგიდა',                     'Writing Desk',
   'კომპაქტური 120 სმ სამუშაო მაგიდა ერთი უჯრით და კაბელის არხით.',
   'Compact 120 cm writing desk with a single shallow drawer and cable channel.',
   1850, 'GEL', false, true, 3),
  ('low-coffee-table',         (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'დაბალი ყავის მაგიდა',                'Low Coffee Table',
   'დაბალი ყავის მაგიდა სქელი მუხის ზედაპირით და დახრილი ფეხებით.',
   'Low-slung coffee table with a thick oak top and tapered, splayed legs.',
   1600, 'GEL', false, true, 4),
  ('counter-stool',            (SELECT id FROM cats WHERE slug = 'tables-chairs'),
   'ბარული სკამი',                       'Counter Stool',
   'უზურგო ბარული სიმაღლის სკამი კაკლისგან, ოდნავ მოღუნული დასაჯდომით.',
   'Backless counter-height stool in walnut with a lightly contoured seat.',
   540,  'GEL', false, true, 5);

-- ---------------------------------------------------------------------------
-- Product images
-- ---------------------------------------------------------------------------
-- Stable picsum.photos URLs keyed by the same seeds used in
-- `content/products.ts`, so the offline and online builds render the
-- same imagery. Each row is marked `is_primary = true` because
-- products currently have a single image.
INSERT INTO public.product_images (product_id, storage_path, alt_ka, alt_en, sort_order, is_primary)
SELECT
  p.id,
  CASE p.slug
    WHEN 'linen-three-seater'        THEN 'https://picsum.photos/seed/fm-sofa-001/1200/900'
    WHEN 'walnut-frame-loveseat'     THEN 'https://picsum.photos/seed/fm-sofa-002/1200/900'
    WHEN 'modular-corner'            THEN 'https://picsum.photos/seed/fm-sofa-003/1200/900'
    WHEN 'compact-armchair'          THEN 'https://picsum.photos/seed/fm-sofa-004/1200/900'
    WHEN 'boucle-club-chair'         THEN 'https://picsum.photos/seed/fm-sofa-005/1200/900'
    WHEN 'leather-daybed'            THEN 'https://picsum.photos/seed/fm-sofa-006/1200/900'
    WHEN 'oak-platform-bed'          THEN 'https://picsum.photos/seed/fm-bed-001/1200/900'
    WHEN 'upholstered-headboard-bed' THEN 'https://picsum.photos/seed/fm-bed-002/1200/900'
    WHEN 'slatted-walnut-dresser'    THEN 'https://picsum.photos/seed/fm-bed-003/1200/900'
    WHEN 'round-bedside-table'       THEN 'https://picsum.photos/seed/fm-bed-004/1200/900'
    WHEN 'wardrobe-two-door'         THEN 'https://picsum.photos/seed/fm-bed-005/1200/900'
    WHEN 'bench-end-of-bed'          THEN 'https://picsum.photos/seed/fm-bed-006/1200/900'
    WHEN 'oak-dining-table-six'      THEN 'https://picsum.photos/seed/fm-table-001/1200/900'
    WHEN 'round-pedestal-table'      THEN 'https://picsum.photos/seed/fm-table-002/1200/900'
    WHEN 'wishbone-dining-chair'     THEN 'https://picsum.photos/seed/fm-table-003/1200/900'
    WHEN 'writing-desk'              THEN 'https://picsum.photos/seed/fm-table-004/1200/900'
    WHEN 'low-coffee-table'          THEN 'https://picsum.photos/seed/fm-table-005/1200/900'
    WHEN 'counter-stool'             THEN 'https://picsum.photos/seed/fm-table-006/1200/900'
  END,
  -- Bilingual alt text — kept brief so admins can refine later.
  p.name_ka,
  p.name_en,
  0,
  true
FROM public.products p;
