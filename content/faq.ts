// FAQ entries for the home page. Bilingual.
//
// Edit copy here when you have real answers — the JSON-LD generator
// reads from this same file, so the schema stays in sync automatically.

import type { Locale } from "@/i18n/routing";

export type FaqEntry = {
  question: { ka: string; en: string };
  answer: { ka: string; en: string };
};

const entries: FaqEntry[] = [
  {
    question: {
      en: "Where is Furnituremodern made?",
      ka: "სად იწარმოება Furnituremodern?",
    },
    answer: {
      en: "Every piece is made in our Tbilisi workshop, in small batches, by a team of full-time furniture-makers.",
      ka: "თითოეული ნივთი იწარმოება ჩვენს თბილისის სახელოსნოში, მცირე პარტიებით, ხელოსნების გუნდის მიერ.",
    },
  },
  {
    question: {
      en: "What materials do you use?",
      ka: "რა მასალებს იყენებთ?",
    },
    answer: {
      en: "Solid white oak and European walnut for frames, natural Belgian linen and Italian wool for upholstery, and full-grain leather sourced from a single tannery.",
      ka: "ჩარჩოებისთვის — ბუნებრივი თეთრი მუხა და ევროპული კაკალი; შემოსასათავად — ბუნებრივი ბელგიური სელი და იტალიური მატყლი; ტყავი — ერთი მთრიმლავი ფერმიდან.",
    },
  },
  {
    question: {
      en: "How long does delivery take?",
      ka: "რამდენ ხანში ხდება მიწოდება?",
    },
    answer: {
      en: "In-stock pieces ship within 5–7 business days inside Georgia. Made-to-order items take 4–6 weeks; we keep you updated at every stage.",
      ka: "მარაგში არსებული ნივთები იგზავნება 5–7 სამუშაო დღეში საქართველოს მასშტაბით. შესაკვეთი ნივთები — 4–6 კვირა; ყველა ეტაპზე ინფორმაციას ვაწვდით.",
    },
  },
  {
    question: {
      en: "Do you offer a warranty?",
      ka: "გაქვთ გარანტია?",
    },
    answer: {
      en: "Yes — every piece carries a 5-year structural warranty covering the frame, joinery and mechanisms.",
      ka: "კი — თითოეულ ნივთს თან ახლავს 5-წლიანი სტრუქტურული გარანტია ჩარჩოზე, შეერთებებზე და მექანიზმებზე.",
    },
  },
  {
    question: {
      en: "Can I see a piece in person before buying?",
      ka: "შეიძლება ნივთი ნახვა შეძენამდე?",
    },
    answer: {
      en: "Yes. Our Tbilisi showroom is open Monday to Saturday — see the footer for the full address and hours.",
      ka: "კი. ჩვენი თბილისის გამოფენა-ცენტრი ღიაა ორშაბათიდან შაბათამდე — სრული მისამართი და სამუშაო საათები იხილეთ ქვედა მენიუში.",
    },
  },
  {
    question: {
      en: "Do you ship outside Georgia?",
      ka: "აგზავნით საქართველოს გარეთ?",
    },
    answer: {
      en: "Yes — we ship across the EU and the Caucasus region. International orders are quoted individually based on size and destination.",
      ka: "კი — ვაგზავნით ევროკავშირში და კავკასიის რეგიონში. საერთაშორისო შეკვეთების ფასი გამოითვლება ინდივიდუალურად.",
    },
  },
];

export const getFaqEntries = (locale: Locale) =>
  entries.map((e) => ({
    question: e.question[locale],
    answer: e.answer[locale],
  }));
