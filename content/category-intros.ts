// Long-form category intro copy. Lives outside the DB because it's
// editorial copy, not catalog data — same reason the brand story sits
// in `messages/*.json` rather than as a CMS row.
//
// Each entry is the 80–120 word paragraph that opens the category page,
// in both supported locales.

import type { CategorySlug } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

const intros: Record<CategorySlug, Record<Locale, string>> = {
  sofas: {
    en: "Our sofa collection is built for daily living, not photo shoots. Frames are kiln-dried solid oak, suspension uses 8-way hand-tied springs, and every cushion has a separate down-and-feather core inside a moisture-wicking ticking. Covers are removable, dry-cleanable, and replaceable — so the sofa you buy today can be reupholstered in a different fabric ten years from now without throwing away the structure. Choose from compact two-seaters, generous three-seaters, modular corner systems, and a full-grain leather daybed.",
    ka: "ჩვენი დივნების კოლექცია შექმნილია ყოველდღიური ცხოვრებისთვის, არა ფოტოსესიებისთვის. ჩარჩოები არის ნახარშავი მუხის ხისგან, ფუძე იყენებს 8-მხრივი ხელით შეკრულ ზამბარებს, ხოლო ყოველ ბალიშს აქვს ცალკე ფუმფულას ფენა. შესამოსი მოსახსნელი და ცვლადია — ესე იგი ათი წლის შემდეგაც შეგიძლიათ შეცვალოთ ქსოვილი დივნის ჩარჩოს გადაგდების გარეშე. აირჩიეთ კომპაქტურ ორადგილიან, კომფორტულ სამადგილიან, მოდულურ კუთხის ან ტყავის დღიურ დივანს შორის.",
  },
  bedrooms: {
    en: "The bedroom collection focuses on the pieces you actually need: a low platform bed, a roomy dresser, a generous wardrobe, and the small companions — bedside tables, an end-of-bed bench. Frames are solid white oak or European walnut, joined with traditional mortise-and-tenon construction so they get tighter, not looser, with age. Drawers run on full-extension soft-close runners; wardrobe interiors include a hanging rail, two adjustable shelves, and a dedicated shoe shelf at the base.",
    ka: "საძინებლის კოლექცია ფოკუსირებულია იმ ნივთებზე, რომლებიც ნამდვილად გჭირდებათ: დაბალი პლატფორმის საწოლი, ფართო კომოდი, ვიწრო გარდერობი და გვერდითი ნივთები — საწოლის გვერდითი მაგიდები, საწოლის ბოლოს სკამი. ჩარჩოები არის თეთრი მუხა ან ევროპული კაკალი, ტრადიციული შეერთებებით — დროთა განმავლობაში ისინი მკაცრდებიან, არ დუნდებიან. უჯრები გადის სრული გაშლის სარბენებზე; გარდერობს აქვს ჩამოსაკიდი, ორი რეგულირებადი თარო და ფეხსაცმლის სპეციალური თარო ფსკერზე.",
  },
  "tables-chairs": {
    en: "Tables and chairs are the pieces a household uses most, so we make them the most carefully. Dining tables come in solid oak or walnut; the round pedestal version sits four, the rectangular six. Wishbone-back dining chairs use steam-bent oak frames and hand-woven paper-cord seats — both materials get more comfortable as they soften with use. We also offer a writing desk, a low coffee table, and a backless counter stool sized for kitchen islands.",
    ka: "მაგიდები და სკამები არის ის ნივთები, რომლებსაც ოჯახი ყველაზე ხშირად იყენებს, ამიტომ მათ ყველაზე ფრთხილად ვამზადებთ. სასადილო მაგიდები იწარმოება ბუნებრივი მუხისგან ან კაკლისგან; მრგვალი ფუძის ვერსია ეტევა ოთხს, ოთხკუთხა — ექვსს. ვიშბოუნ ზურგით სკამები იყენებენ ორთქლით მოღუნულ მუხის ჩარჩოებს და ხელით ნაქსოვ ქაღალდის თოკის დასაჯდომებს — ორივე მასალა დროთა განმავლობაში უფრო კომფორტული ხდება. ასევე გვაქვს სამუშაო მაგიდა, დაბალი ყავის მაგიდა და უზურგო ბარული სკამი.",
  },
};

const titles: Record<CategorySlug, Record<Locale, string>> = {
  sofas: {
    en: "Sofas — modern, hand-finished seating",
    ka: "დივნები — თანამედროვე, ხელნაკეთური ავეჯი",
  },
  bedrooms: {
    en: "Bedrooms — beds, dressers, wardrobes",
    ka: "საძინებლები — საწოლები, კომოდები, გარდერობები",
  },
  "tables-chairs": {
    en: "Tables & Chairs — dining and workspace pieces",
    ka: "მაგიდები და სკამები — სასადილო და სამუშაო ავეჯი",
  },
};

const descriptions: Record<CategorySlug, Record<Locale, string>> = {
  sofas: {
    en: "Modern sofas in solid oak and Belgian linen. Two-seaters, three-seaters, modular corners and a leather daybed — built and finished by hand in Tbilisi.",
    ka: "თანამედროვე დივნები მუხისგან და ბელგიური სელისგან. ორ-, სამადგილიანი, მოდულური კუთხის და ტყავის დღიური დივნები — დამზადებულია თბილისში, ხელით.",
  },
  bedrooms: {
    en: "Bedroom furniture in solid white oak and walnut: platform beds, dressers, wardrobes, bedside tables. Mortise-and-tenon joinery, soft-close drawers, made in Tbilisi.",
    ka: "საძინებლის ავეჯი თეთრი მუხისგან და კაკლისგან: პლატფორმის საწოლები, კომოდები, გარდერობები, საწოლის გვერდითი მაგიდები. ტრადიციული შეერთებები, მშვიდი დახურვის უჯრები. დამზადებულია თბილისში.",
  },
  "tables-chairs": {
    en: "Solid oak and walnut tables and chairs for dining, work and the kitchen counter. Wishbone dining chairs, pedestal round table, writing desk, low coffee table — handmade in Tbilisi.",
    ka: "მუხის და კაკლის მაგიდები და სკამები სასადილოსთვის, სამუშაოსთვის და სამზარეულოსთვის. ვიშბოუნ სკამები, მრგვალი ფუძემაგიდა, სამუშაო მაგიდა, დაბალი ყავის მაგიდა — ხელით დამზადებული თბილისში.",
  },
};

export function getCategoryIntro(slug: CategorySlug, locale: Locale): string {
  return intros[slug][locale];
}

export function getCategoryTitle(slug: CategorySlug, locale: Locale): string {
  return titles[slug][locale];
}

export function getCategoryDescription(
  slug: CategorySlug,
  locale: Locale
): string {
  return descriptions[slug][locale];
}
