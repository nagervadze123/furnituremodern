// Phase 5b "table of contents" eyebrow strip.
//
// A magazine-masthead-style band that sits between the hero and
// featured categories. Establishes editorial voice and gives visitors
// a quick orientation: 3 in-page anchors / cross-routes, equally
// spaced, separated by middle dots rendered as CSS pseudo-elements
// on the <li> wrappers (so they print, copy, and scrape correctly).
//
// All three links exist:
//   • Collection — /[locale]/sofas (first featured category)
//   • Workshop   — anchor to the brand-story section (#workshop)
//   • Contact    — anchor to the visit-strip section (#visit)
//
// Type — caption (uppercase, 0.08em tracking). Color rest = ink-700,
// hover = terracotta-500. No underline, no background change. Real
// <Link>s; the dot delimiters are pseudo-elements that don't focus.

import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function EyebrowNav() {
  const t = await getTranslations("home.eyebrow_nav");

  return (
    <nav
      aria-label="Section navigation"
      className="border-y border-[var(--color-bone-200)] bg-[var(--color-bone-50)]"
    >
      <ul className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-6 md:px-12">
        <li>
          <Link
            href="/sofas"
            className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-ink-700)] transition-colors hover:text-[var(--color-terracotta-500)] focus-visible:outline-none focus-visible:text-[var(--color-terracotta-500)]"
          >
            {t("collection")}
          </Link>
        </li>
        {/* Middle-dot delimiter — purely decorative. */}
        <li
          aria-hidden="true"
          className="text-xs text-[var(--color-ink-300)]"
        >
          ·
        </li>
        <li>
          <a
            href="#workshop"
            className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-ink-700)] transition-colors hover:text-[var(--color-terracotta-500)] focus-visible:outline-none focus-visible:text-[var(--color-terracotta-500)]"
          >
            {t("workshop")}
          </a>
        </li>
        <li
          aria-hidden="true"
          className="text-xs text-[var(--color-ink-300)]"
        >
          ·
        </li>
        <li>
          <a
            href="#visit"
            className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-ink-700)] transition-colors hover:text-[var(--color-terracotta-500)] focus-visible:outline-none focus-visible:text-[var(--color-terracotta-500)]"
          >
            {t("contact")}
          </a>
        </li>
      </ul>
    </nav>
  );
}
