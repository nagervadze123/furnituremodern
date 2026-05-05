// Phase 6 Slice 2 — magazine-masthead "In this issue" strip.
//
// Replaces the Phase 5b EyebrowNav (deleted in this slice). Renders a
// three-column band that sits between the home Hero and
// FeaturedCategories: italic Fraunces "In this issue —" on the left,
// a centred list of five numerated section anchors, and the issue
// number ("№06 · 2026") on the right. The issue number is hardcoded
// behind an i18n key per `docs/design/sessions/phase-b.md` D5; no
// `siteConfig.brand.issueNumber` field is added.
//
// All five sections link to in-page anchors that the existing home
// composition already provides (or that this slice adds in the same
// commit):
//   I. Categories  → #categories (FeaturedCategories — existing)
//   II. Featured   → #featured (FeaturedCollection — id added in Slice 2)
//   III. Recent    → #signature (SignatureProducts — existing)
//   IV. Workshop   → #workshop (BrandStory — existing)
//   V. Visit       → #visit (VisitStrip — existing)
//
// Server component. No client JS — all behaviour is a static
// document anchor jump.
//
// Visual reference:
// `_design-reference/components/page-homepage.jsx:95-138`.

import { getTranslations } from "next-intl/server";

import { SectionMarker } from "@/components/design";
import { Link } from "@/i18n/navigation";

const SECTIONS = [
  { numeral: "I", key: "section_1", href: "#categories" },
  { numeral: "II", key: "section_2", href: "#featured" },
  { numeral: "III", key: "section_3", href: "#signature" },
  { numeral: "IV", key: "section_4", href: "#workshop" },
  { numeral: "V", key: "section_5", href: "#visit" },
] as const;

export async function IssueRibbon() {
  const t = await getTranslations("home.issue_ribbon");

  return (
    <nav
      aria-label="Section navigation"
      className="border-y border-[var(--color-bone-200)] bg-[var(--color-bone-50)]"
    >
      <div
        className="
          mx-auto grid w-full max-w-[1760px] items-center gap-8 px-6 py-5 md:px-12
          md:grid-cols-[auto_1fr_auto]
        "
      >
        {/* Left — italic Fraunces "In this issue —". Eyebrow-style
            sizing but with display font + italic for the magazine
            voice. */}
        <span className="text-sm italic text-[var(--color-ink-500)] font-display">
          {t("in_this_issue")}
        </span>

        {/* Centre — five numerated section anchors with middle-dot
            separators. Each item is a SectionMarker wrapped in a
            locale-aware Link so `/en/#workshop` resolves correctly
            from non-home routes. */}
        <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {SECTIONS.map((section, i) => (
            <li
              key={section.key}
              className="flex items-center gap-x-2"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="text-xs text-[var(--color-ink-300)]"
                >
                  ·
                </span>
              )}
              <Link
                href={`/${section.href}`}
                className="
                  inline-flex items-center transition-colors
                  hover:text-[var(--color-ink-900)]
                  focus-visible:outline-none focus-visible:text-[var(--color-ink-900)]
                "
              >
                <SectionMarker numeral={section.numeral} label={t(section.key)} />
              </Link>
            </li>
          ))}
        </ol>

        {/* Right — issue number. Same eyebrow voice as the left side
            but without the leading hairline (Eyebrow already paints
            no-hairline at the React-component layer). */}
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)] md:justify-self-end">
          {t("issue")}
        </span>
      </div>
    </nav>
  );
}
