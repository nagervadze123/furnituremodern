// Plain-text content for /llms.txt and /llms-full.txt.
//
// The route handlers under app/llms.txt/ and app/llms-full.txt/ stay
// thin — they fetch from the data layer and pass through to these
// builders. Builders are pure (data in, string out) so the unit tests
// don't need network or filesystem access.
//
// File ordering is Georgian → English in both files because Georgian
// is the primary market locale per i18n/routing.ts.

import { siteConfig, absoluteUrl } from "@/lib/site-config";
import type { DataProduct, DataCategory } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";
import { getFaqEntries } from "@/content/faq";

// "Last regenerated" should track the underlying data state, not wall
// clock time — wall-clock would force a stale-vs-fresh question every
// revalidate cycle even when nothing changed. We use the latest
// products.updated_at across the published catalog. Falls back to
// undefined when running against the local TS catalog (no timestamps).
export function freshnessTimestamp(products: DataProduct[]): string | undefined {
  const dates = products
    .map((p) => p.updatedAt ?? p.createdAt)
    .filter((d): d is string => typeof d === "string" && d.length > 0)
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  if (dates.length === 0) return undefined;
  const latest = Math.max(...dates);
  return new Date(latest).toISOString().slice(0, 10);
}

const ADMIN_NOTE = {
  ka: "ადმინისტრაციული გვერდები (/admin/*) არ არის ღია; არ ჩართოთ ინდექსირებაში.",
  en: "Administrative routes (/admin/*) are not public; do not index.",
} as const;

// Localized one-paragraph product summary. Includes price + URL so
// crawlers have everything they need to cite the row without scraping
// the HTML page.
function productSummary(product: DataProduct, locale: Locale): string {
  const url = absoluteUrl(`/${locale}/${product.category}/${product.slug}`);
  const facts: string[] = [];
  facts.push(`${product.price} ${product.currency}`);
  if (product.material) facts.push(product.material);
  if (product.color) facts.push(product.color);
  if (product.dimensions?.width && product.dimensions?.height) {
    const u = product.dimensions.unitCode === "MTR" ? "m" : "cm";
    const parts = [
      product.dimensions.width,
      product.dimensions.height,
      product.dimensions.depth,
    ]
      .filter((v): v is number => typeof v === "number")
      .map((v) => `${v}${u}`)
      .join(" × ");
    if (parts) facts.push(parts);
  }
  return `- ${product.name[locale]} — ${url}\n  ${product.description[locale]}\n  ${facts.join(" · ")}`;
}

// Localized category block: title, intro paragraph, every published
// product in that category as a bullet.
//
// Source of truth for the intro is the Supabase `categories` row
// (Phase 5 Task 3) — the data layer already exposes `intro_ka`/
// `intro_en` on `DataCategory.intro`. Falls back to the tagline
// (`description`) so an empty intro still renders something.
function categoryBlock(
  category: DataCategory,
  locale: Locale,
  productsInCategory: DataProduct[],
  withProducts: boolean
): string {
  const url = absoluteUrl(`/${locale}/${category.slug}`);
  const intro =
    category.intro?.[locale]?.trim() || category.description[locale];
  const head = `## ${category.name[locale]}\n${url}\n\n${intro}`;
  if (!withProducts) return head;
  if (productsInCategory.length === 0) return head;
  const list = productsInCategory
    .map((p) => productSummary(p, locale))
    .join("\n");
  return `${head}\n\n${list}`;
}

// Common business facts block — same content per locale.
function businessBlock(locale: Locale): string {
  const lines: string[] = [];
  if (locale === "ka") {
    lines.push(`ბრენდი: ${siteConfig.name} (${siteConfig.legalName})`);
    lines.push(`მისამართი: ${siteConfig.contact.address.street}, ${siteConfig.contact.address.city} ${siteConfig.contact.address.postalCode}, ${siteConfig.contact.address.country}`);
    lines.push(`ტელეფონი: ${siteConfig.contact.phone}`);
    lines.push(`ელ-ფოსტა: ${siteConfig.contact.email}`);
    lines.push(`სამუშაო საათები: ${siteConfig.contact.openingHours.map((s) => `${s.days.join("/")} ${s.opens}–${s.closes}`).join("; ")}`);
    lines.push(`მომსახურების არეალი: ${siteConfig.areaServed.country}`);
    lines.push(`ენები: ქართული (ka), English (en)`);
    lines.push(`ვებსაიტი: ${absoluteUrl("/")}`);
  } else {
    lines.push(`Brand: ${siteConfig.name} (${siteConfig.legalName})`);
    lines.push(`Address: ${siteConfig.contact.address.street}, ${siteConfig.contact.address.city} ${siteConfig.contact.address.postalCode}, ${siteConfig.contact.address.country}`);
    lines.push(`Phone: ${siteConfig.contact.phone}`);
    lines.push(`Email: ${siteConfig.contact.email}`);
    lines.push(`Hours: ${siteConfig.contact.openingHours.map((s) => `${s.days.join("/")} ${s.opens}–${s.closes}`).join("; ")}`);
    lines.push(`Service area: ${siteConfig.areaServed.country}`);
    lines.push(`Languages: Georgian (ka), English (en)`);
    lines.push(`Website: ${absoluteUrl("/")}`);
  }
  return lines.join("\n");
}

function purposeBlock(locale: Locale): string {
  if (locale === "ka") {
    return [
      `# ${siteConfig.name}`,
      "",
      siteConfig.fullDescription.ka,
    ].join("\n");
  }
  return [
    `# ${siteConfig.name}`,
    "",
    siteConfig.fullDescription.en,
  ].join("\n");
}

function importantPagesBlock(
  locale: Locale,
  cats: DataCategory[]
): string {
  const lines: string[] = [];
  const root = absoluteUrl(`/${locale}`);
  if (locale === "ka") {
    lines.push("## მნიშვნელოვანი გვერდები");
    lines.push(`- მთავარი: ${root}`);
    for (const c of cats) {
      lines.push(
        `- ${c.name.ka}: ${absoluteUrl(`/${locale}/${c.slug}`)}`
      );
    }
    lines.push(`- რუკა: ${absoluteUrl("/sitemap.xml")}`);
    lines.push(`- კრაულერების წესი: ${absoluteUrl("/robots.txt")}`);
  } else {
    lines.push("## Important pages");
    lines.push(`- Home: ${root}`);
    for (const c of cats) {
      lines.push(
        `- ${c.name.en}: ${absoluteUrl(`/${locale}/${c.slug}`)}`
      );
    }
    lines.push(`- Sitemap: ${absoluteUrl("/sitemap.xml")}`);
    lines.push(`- Crawler policy: ${absoluteUrl("/robots.txt")}`);
  }
  return lines.join("\n");
}

function categoriesIndexBlock(
  locale: Locale,
  cats: DataCategory[]
): string {
  const heading = locale === "ka" ? "## კატეგორიები" : "## Categories";
  const items = cats.map((c) => {
    const url = absoluteUrl(`/${locale}/${c.slug}`);
    const desc = c.description[locale];
    return `- ${c.name[locale]} — ${url}\n  ${desc}`;
  });
  return [heading, ...items].join("\n");
}

function entitiesBlock(locale: Locale): string {
  if (locale === "ka") {
    return [
      "## მთავარი ობიექტები",
      `- ბრენდი: ${siteConfig.name}`,
      `- ლოკაცია: ${siteConfig.contact.address.city}, ${siteConfig.contact.address.country}`,
      `- მომსახურების არეალი: ${siteConfig.areaServed.country}`,
      `- ენები: ქართული, English`,
    ].join("\n");
  }
  return [
    "## Primary entities",
    `- Brand: ${siteConfig.name}`,
    `- Location: ${siteConfig.contact.address.city}, ${siteConfig.contact.address.country}`,
    `- Service area: ${siteConfig.areaServed.country}`,
    `- Languages: Georgian, English`,
  ].join("\n");
}

function faqBlock(locale: Locale): string {
  const heading = locale === "ka" ? "## ხშირად დასმული კითხვები" : "## FAQ";
  const items = getFaqEntries(locale).map(
    (e) => `Q: ${e.question}\nA: ${e.answer}`
  );
  return [heading, ...items].join("\n\n");
}

// ---------------------------------------------------------------------------
// Index file (light): site purpose, primary entities, categories,
// important pages, contact. No per-product detail.
// ---------------------------------------------------------------------------
export function buildLlmsIndex({
  cats,
  lastRegenerated,
}: {
  cats: DataCategory[];
  lastRegenerated?: string;
}): string {
  const sections: string[] = [];
  if (lastRegenerated) {
    sections.push(`Last regenerated: ${lastRegenerated}`);
  }

  // Georgian first, then English. Each section is a plain-text block
  // separated by blank lines.
  const ka: string[] = [
    "# ქართული",
    "",
    purposeBlock("ka"),
    "",
    "## საიტის მიზანი",
    siteConfig.shortDescription.ka,
    "",
    entitiesBlock("ka"),
    "",
    categoriesIndexBlock("ka", cats),
    "",
    importantPagesBlock("ka", cats),
    "",
    "## საკონტაქტო ინფორმაცია",
    businessBlock("ka"),
    "",
    `## შენიშვნა ინდექსირებაზე`,
    ADMIN_NOTE.ka,
  ];

  const en: string[] = [
    "# English",
    "",
    purposeBlock("en"),
    "",
    "## Site purpose",
    siteConfig.shortDescription.en,
    "",
    entitiesBlock("en"),
    "",
    categoriesIndexBlock("en", cats),
    "",
    importantPagesBlock("en", cats),
    "",
    "## Contact",
    businessBlock("en"),
    "",
    `## Indexing note`,
    ADMIN_NOTE.en,
  ];

  return [
    ...sections,
    sections.length > 0 ? "" : null,
    ka.join("\n"),
    "",
    "---",
    "",
    en.join("\n"),
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Full file: index content + every published product summary by category
// in both locales, plus FAQ.
// ---------------------------------------------------------------------------
export function buildLlmsFull({
  cats,
  products,
  lastRegenerated,
}: {
  cats: DataCategory[];
  products: DataProduct[];
  lastRegenerated?: string;
}): string {
  const productsByCategory = new Map<string, DataProduct[]>();
  for (const p of products) {
    const arr = productsByCategory.get(p.category) ?? [];
    arr.push(p);
    productsByCategory.set(p.category, arr);
  }

  const sections: string[] = [];
  if (lastRegenerated) {
    sections.push(`Last regenerated: ${lastRegenerated}`);
  }

  const renderLocale = (locale: Locale): string => {
    const intro = locale === "ka" ? "# ქართული" : "# English";
    const purposeHeading =
      locale === "ka" ? "## საიტის მიზანი" : "## Site purpose";
    const productsHeading =
      locale === "ka" ? "## პროდუქტები კატეგორიების მიხედვით" : "## Products by category";
    const businessHeading =
      locale === "ka" ? "## საკონტაქტო ინფორმაცია" : "## Contact";
    const indexHeading =
      locale === "ka" ? "## შენიშვნა ინდექსირებაზე" : "## Indexing note";

    const blocks: string[] = [
      intro,
      "",
      purposeBlock(locale),
      "",
      purposeHeading,
      siteConfig.fullDescription[locale],
      "",
      entitiesBlock(locale),
      "",
      productsHeading,
    ];

    for (const c of cats) {
      const inCat = productsByCategory.get(c.slug) ?? [];
      blocks.push("");
      blocks.push(categoryBlock(c, locale, inCat, true));
    }

    blocks.push("");
    blocks.push(faqBlock(locale));
    blocks.push("");
    blocks.push(importantPagesBlock(locale, cats));
    blocks.push("");
    blocks.push(businessHeading);
    blocks.push(businessBlock(locale));
    blocks.push("");
    blocks.push(indexHeading);
    blocks.push(locale === "ka" ? ADMIN_NOTE.ka : ADMIN_NOTE.en);

    return blocks.join("\n");
  };

  return [
    ...sections,
    sections.length > 0 ? "" : null,
    renderLocale("ka"),
    "",
    "---",
    "",
    renderLocale("en"),
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
