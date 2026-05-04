// Product catalog.
//
// Today: a typed TypeScript array. Tomorrow: swap this file for a CMS
// fetcher (Sanity, Contentful, Supabase, whatever) — every consumer
// already imports through getProductsByCategory(), so you only need to
// change the implementation here.

import type { CategorySlug } from "@/lib/site-config";

export type ProductImage = {
  // Absolute URL. Phase 5 Task 4 retired picsum.photos — the offline
  // fallback now references the same Supabase Storage stock keys as
  // the live DB. When NEXT_PUBLIC_SUPABASE_URL is unset (truly bare
  // dev / CI without a project), every URL collapses to the brand
  // monogram so cards still render something instead of broken images.
  url: string;
  // Required alt text; bilingual so both locales stay accessible.
  alt: { ka: string; en: string };
  width: number;
  height: number;
};

export type Product = {
  id: string;
  slug: string;
  category: CategorySlug;
  name: { ka: string; en: string };
  description: { ka: string; en: string };
  // Stored in minor unit-free integers — 2400 means 2400 GEL.
  price: number;
  currency: "GEL";
  images: ProductImage[];

  // ---- Optional ecommerce fields (mirror lib/data/types.DataProduct) ----
  // We populate `material` for placeholders where the description names
  // a real material. Other fields stay undefined here so we don't ship
  // fabricated dimensions/weights — admins fill these in via Supabase
  // when real catalog data arrives.
  sku?: string;
  mpn?: string;
  color?: string;
  material?: string;
};

// Stock-photo helper. Returns a Supabase Storage public URL when a
// project is configured, otherwise the brand monogram. The bucket is
// public so anonymous reads work without a key — the offline fallback
// can still hit the dev project's Storage as long as it's reachable.
//
// `filename` is the same key the live DB references via
// product_images.storage_path = "stock/<filename>". Keeping the offline
// catalogue in lockstep with the seeded stock manifest means swapping
// the manifest replaces both code paths simultaneously.
const STOCK_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/product-images/stock`;
})();

const stockImage = (
  filename: string,
  alt: { ka: string; en: string }
): ProductImage => ({
  url: STOCK_BASE ? `${STOCK_BASE}/${filename}` : "/icon.svg",
  alt,
  width: 1200,
  height: 900,
});

// ---------------------------------------------------------------------------
// Catalog
// 6 products per category × 3 categories = 18 placeholder products.
// All copy is intentionally short so it is easy to swap for real content.
// ---------------------------------------------------------------------------
const products: Product[] = [
  // ---------- SOFAS ----------
  {
    id: "sofa-001",
    slug: "linen-three-seater",
    category: "sofas",
    name: { en: "Linen Three-Seater", ka: "სელის სამადგილიანი დივანი" },
    description: {
      en: "A relaxed three-seater upholstered in heavyweight Belgian linen with solid oak feet.",
      ka: "მოდუნებული სამადგილიანი დივანი ბელგიური სელით და მუხის ფეხებით.",
    },
    price: 4200,
    currency: "GEL",
    images: [
      stockImage("sofa-linen-cream-001.jpg", {
        en: "Linen three-seater sofa in a sunlit room",
        ka: "სელის დივანი მზიან ოთახში",
      }),
    ],
  },
  {
    id: "sofa-002",
    slug: "walnut-frame-loveseat",
    category: "sofas",
    name: { en: "Walnut Frame Loveseat", ka: "კაკლის ჩარჩოიანი ლავსიტი" },
    description: {
      en: "Two-seat loveseat with an exposed solid walnut frame and removable wool covers.",
      ka: "ორადგილიანი ლავსიტი კაკლის ხილული ჩარჩოთი და მოსახსნელი მატყლის ბალიშებით.",
    },
    price: 3600,
    currency: "GEL",
    images: [
      stockImage("sofa-leather-vintage-008.jpg", {
        en: "Walnut frame loveseat with wool cushions",
        ka: "კაკლის ლავსიტი მატყლის ბალიშებით",
      }),
    ],
  },
  {
    id: "sofa-003",
    slug: "modular-corner",
    category: "sofas",
    name: { en: "Modular Corner Sofa", ka: "მოდულური კუთხის დივანი" },
    description: {
      en: "Configurable corner sofa: rearrange the four modules to fit any living room.",
      ka: "კონფიგურირებადი კუთხის დივანი ოთხი მოდულით ნებისმიერი ოთახისთვის.",
    },
    price: 6800,
    currency: "GEL",
    images: [
      stockImage("sofa-sectional-modular-011.jpg", {
        en: "Modular corner sofa in a wide living room",
        ka: "მოდულური კუთხის დივანი ფართო ოთახში",
      }),
    ],
  },
  {
    id: "sofa-004",
    slug: "compact-armchair",
    category: "sofas",
    name: { en: "Compact Armchair", ka: "კომპაქტური სავარძელი" },
    description: {
      en: "A reading-height armchair with a tall back and tight tailoring — ideal for small apartments.",
      ka: "მაღალი ზურგით და მკაცრი ფორმით სავარძელი — იდეალური მცირე ბინებისთვის.",
    },
    price: 2100,
    currency: "GEL",
    images: [
      stockImage("armchair-vintage-warm-012.jpg", {
        en: "Compact armchair beside a reading lamp",
        ka: "კომპაქტური სავარძელი წიგნის ლამპის გვერდით",
      }),
    ],
  },
  {
    id: "sofa-005",
    slug: "boucle-club-chair",
    category: "sofas",
    name: { en: "Bouclé Club Chair", ka: "ბუკლე კლუბური სკამი" },
    description: {
      en: "Curved club chair upholstered in cream bouclé with a hardwood swivel base.",
      ka: "მრუდი კლუბური სკამი კრემისფერი ბუკლეთი და ხის მბრუნავი ფუძით.",
    },
    price: 2800,
    currency: "GEL",
    images: [
      stockImage("club-chair-leather-tufted-014.jpg", {
        en: "Cream bouclé club chair with hardwood base",
        ka: "კრემისფერი ბუკლე სკამი ხის ფუძით",
      }),
    ],
  },
  {
    id: "sofa-006",
    slug: "leather-daybed",
    category: "sofas",
    name: { en: "Leather Daybed", ka: "ტყავის დღიური დივანი" },
    description: {
      en: "Full-grain leather daybed with a low oak base — works as a sofa, naps as a bed.",
      ka: "სრული მარცვლის ტყავის დღიური დივანი დაბალი მუხის ფუძით — დივანი დღით, საწოლი ღამით.",
    },
    price: 5400,
    currency: "GEL",
    images: [
      stockImage("daybed-wooden-sunlit-015.jpg", {
        en: "Leather daybed with low oak base",
        ka: "ტყავის დღიური დივანი მუხის ფუძით",
      }),
    ],
  },

  // ---------- BEDROOMS ----------
  {
    id: "bed-001",
    slug: "oak-platform-bed",
    category: "bedrooms",
    name: { en: "Oak Platform Bed", ka: "მუხის პლატფორმის საწოლი" },
    description: {
      en: "Low-profile platform bed in solid white oak with a softly curved headboard.",
      ka: "დაბალი პროფილის პლატფორმის საწოლი ბუნებრივი მუხისგან, ნაზად მრუდი ზურგით.",
    },
    price: 3900,
    currency: "GEL",
    images: [
      stockImage("bed-platform-oak-003.jpg", {
        en: "Oak platform bed with linen bedding",
        ka: "მუხის საწოლი სელის თეთრეულით",
      }),
    ],
  },
  {
    id: "bed-002",
    slug: "upholstered-headboard-bed",
    category: "bedrooms",
    name: {
      en: "Upholstered Headboard Bed",
      ka: "შემოსილი ზურგით საწოლი",
    },
    description: {
      en: "Queen-size bed with a deep, channel-tufted linen headboard and walnut legs.",
      ka: "ორმაგი საწოლი ღრმა, კონცხებიანი სელის ზურგით და კაკლის ფეხებით.",
    },
    price: 4500,
    currency: "GEL",
    images: [
      stockImage("headboard-quilted-beige-008.jpg", {
        en: "Upholstered linen headboard with walnut legs",
        ka: "სელის შემოსილი ზურგი კაკლის ფეხებით",
      }),
    ],
  },
  {
    id: "bed-003",
    slug: "slatted-walnut-dresser",
    category: "bedrooms",
    name: { en: "Slatted Walnut Dresser", ka: "ფიცრიანი კაკლის კომოდი" },
    description: {
      en: "Six-drawer dresser with vertical walnut slats and soft-close runners.",
      ka: "ექვსუჯრიანი კომოდი ვერტიკალური კაკლის ფიცრებით და მშვიდი დახურვის სარბენით.",
    },
    price: 2950,
    currency: "GEL",
    images: [
      stockImage("dresser-oak-warm-010.jpg", {
        en: "Walnut dresser with six drawers",
        ka: "კაკლის კომოდი ექვსი უჯრით",
      }),
    ],
  },
  {
    id: "bed-004",
    slug: "round-bedside-table",
    category: "bedrooms",
    name: { en: "Round Bedside Table", ka: "მრგვალი საწოლის გვერდითი მაგიდა" },
    description: {
      en: "A small round bedside table in oak with a single drawer and brass pull.",
      ka: "მცირე მრგვალი საწოლის გვერდითი მაგიდა მუხისგან, ერთი უჯრით და სპილენძის სახელურით.",
    },
    price: 950,
    currency: "GEL",
    images: [
      stockImage("bedside-wood-round-014.jpg", {
        en: "Round oak bedside table with brass pull",
        ka: "მრგვალი მუხის მაგიდა სპილენძის სახელურით",
      }),
    ],
  },
  {
    id: "bed-005",
    slug: "wardrobe-two-door",
    category: "bedrooms",
    name: { en: "Two-Door Wardrobe", ka: "ორკარიანი გარდერობი" },
    description: {
      en: "Tall two-door wardrobe in white oak with a dedicated shoe shelf at the base.",
      ka: "მაღალი ორკარიანი გარდერობი თეთრი მუხისგან, ფეხსაცმლის სპეციალური თაროთი.",
    },
    price: 5200,
    currency: "GEL",
    images: [
      stockImage("wardrobe-oak-glass-012.jpg", {
        en: "Tall two-door white oak wardrobe",
        ka: "მაღალი ორკარიანი მუხის გარდერობი",
      }),
    ],
  },
  {
    id: "bed-006",
    slug: "bench-end-of-bed",
    category: "bedrooms",
    name: { en: "End-of-Bed Bench", ka: "საწოლის ბოლოს სკამი" },
    description: {
      en: "Long upholstered bench sized to sit at the foot of a queen or king bed.",
      ka: "გრძელი შემოსილი სკამი ორმაგი საწოლის ბოლოსთვის.",
    },
    price: 1450,
    currency: "GEL",
    images: [
      stockImage("endbed-bench-wood-015.jpg", {
        en: "Upholstered bench at the foot of a bed",
        ka: "შემოსილი სკამი საწოლის ბოლოში",
      }),
    ],
  },

  // ---------- TABLES & CHAIRS ----------
  {
    id: "table-001",
    slug: "oak-dining-table-six",
    category: "tables-chairs",
    name: {
      en: "Oak Dining Table, 6-Seat",
      ka: "მუხის სასადილო მაგიდა 6-ზე",
    },
    description: {
      en: "Solid oak dining table for six, with a routed edge and a hand-rubbed oil finish.",
      ka: "ბუნებრივი მუხის სასადილო მაგიდა ექვს ადგილზე, ხელით გასუფთავებული ზეთით.",
    },
    price: 4800,
    currency: "GEL",
    images: [
      stockImage("dining-oak-table-001.jpg", {
        en: "Solid oak dining table for six",
        ka: "მუხის სასადილო მაგიდა ექვს ადგილზე",
      }),
    ],
  },
  {
    id: "table-002",
    slug: "round-pedestal-table",
    category: "tables-chairs",
    name: { en: "Round Pedestal Table", ka: "მრგვალი ფუძემაგიდა" },
    description: {
      en: "A 110 cm round pedestal table in walnut — fits four comfortably in a small kitchen.",
      ka: "110 სმ მრგვალი ფუძემაგიდა კაკლისგან — კომფორტულად ეტევა ოთხი ადამიანი.",
    },
    price: 2900,
    currency: "GEL",
    images: [
      stockImage("pedestal-table-rattan-015.jpg", {
        en: "Round walnut pedestal table",
        ka: "მრგვალი კაკლის ფუძემაგიდა",
      }),
    ],
  },
  {
    id: "table-003",
    slug: "wishbone-dining-chair",
    category: "tables-chairs",
    name: { en: "Wishbone Dining Chair", ka: "ვიშბოუნ სასადილო სკამი" },
    description: {
      en: "Y-back dining chair with a hand-woven paper cord seat and steam-bent oak frame.",
      ka: "Y-ფორმის ზურგით სასადილო სკამი, ხელით ნაქსოვი დასაჯდომით და მუხის ჩარჩოთი.",
    },
    price: 720,
    currency: "GEL",
    images: [
      stockImage("chair-wishbone-wood-005.jpg", {
        en: "Wishbone dining chair with paper cord seat",
        ka: "ვიშბოუნ სკამი ქაღალდის თოკის დასაჯდომით",
      }),
    ],
  },
  {
    id: "table-004",
    slug: "writing-desk",
    category: "tables-chairs",
    name: { en: "Writing Desk", ka: "სამუშაო მაგიდა" },
    description: {
      en: "Compact 120 cm writing desk with a single shallow drawer and cable channel.",
      ka: "კომპაქტური 120 სმ სამუშაო მაგიდა ერთი უჯრით და კაბელის არხით.",
    },
    price: 1850,
    currency: "GEL",
    images: [
      stockImage("desk-writing-wood-009.jpg", {
        en: "Compact wooden writing desk",
        ka: "კომპაქტური ხის სამუშაო მაგიდა",
      }),
    ],
  },
  {
    id: "table-005",
    slug: "low-coffee-table",
    category: "tables-chairs",
    name: { en: "Low Coffee Table", ka: "დაბალი ყავის მაგიდა" },
    description: {
      en: "Low-slung coffee table with a thick oak top and tapered, splayed legs.",
      ka: "დაბალი ყავის მაგიდა სქელი მუხის ზედაპირით და დახრილი ფეხებით.",
    },
    price: 1600,
    currency: "GEL",
    images: [
      stockImage("coffee-table-marble-011.jpg", {
        en: "Low oak coffee table with splayed legs",
        ka: "დაბალი მუხის ყავის მაგიდა დახრილი ფეხებით",
      }),
    ],
  },
  {
    id: "table-006",
    slug: "counter-stool",
    category: "tables-chairs",
    name: { en: "Counter Stool", ka: "ბარული სკამი" },
    description: {
      en: "Backless counter-height stool in walnut with a lightly contoured seat.",
      ka: "უზურგო ბარული სიმაღლის სკამი კაკლისგან, ოდნავ მოღუნული დასაჯდომით.",
    },
    price: 540,
    currency: "GEL",
    images: [
      stockImage("stool-counter-wood-013.jpg", {
        en: "Walnut counter stool with contoured seat",
        ka: "კაკლის ბარული სკამი მოღუნული დასაჯდომით",
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Internal access functions
//
// Pages and components MUST go through `lib/data/products.ts` instead.
// These helpers are now an implementation detail of that data layer —
// once we switch to Supabase as the primary source they will only run
// in offline-development fallback mode.
// ---------------------------------------------------------------------------
export const getAllProducts = (): Product[] => products;

export const getProductsByCategory = (category: CategorySlug): Product[] =>
  products.filter((p) => p.category === category);

export const getProductBySlug = (
  category: CategorySlug,
  slug: string
): Product | undefined =>
  products.find((p) => p.category === category && p.slug === slug);
