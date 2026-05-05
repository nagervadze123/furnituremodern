// Visible breadcrumbs above non-home pages. Pair with breadcrumbListJsonLd
// in lib/schema.ts so search engines see the same hierarchy.
//
// Phase 6 Slice 1 — editorial visual port. 12 px uppercase, 0.14 em
// tracking, ink-500 for links / ink-300 for separators / ink-900 for
// the trailing (current) segment. Per the canonical terracotta-500
// rule (`docs/design/contrast.md`), no terracotta paint anywhere on
// this surface — every glyph here is at body size or smaller.
// Visual ported from `_design-reference/components/page-category.jsx:23-33`
// and `_design-reference/components/page-product.jsx:9-19`.
//
// JSON-LD BreadcrumbList shape is unchanged — the schema emitter
// (`lib/schema.ts: breadcrumbListJsonLd`) takes the same `{name, url}[]`
// it always has. Only the rendered markup shifts.

import { Link } from "@/i18n/navigation";

export type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbCrumb[];
};

export function Breadcrumbs({ items }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      // 12 px / 0.14 em tracking / 500 weight — magazine masthead
      // treatment shared with the category and product page mocks.
      className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-500)]"
    >
      {/* `gap-y-2` keeps the trail readable when crumbs wrap on a 360px
          phone. Each tappable crumb gets vertical padding so the row
          height clears the 32px tap-zone minimum even though the link
          text itself is small — full 44px isn't realistic here without
          ballooning the trail, and breadcrumbs are a secondary nav. */}
      <ol className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-x-3.5"
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  // py-1 + -my-1 keeps the tap area at min-h-8 without
                  // changing the visual line height. Hover lifts the
                  // crumb to ink-900 — the trailing segment's resting
                  // colour — so the trail still reads as one shape.
                  className="-my-1 inline-flex min-h-8 items-center break-words py-1 transition-colors hover:text-[var(--color-ink-900)] focus-visible:outline-none focus-visible:text-[var(--color-ink-900)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  // aria-current="page" marks the active crumb for
                  // assistive tech; the trailing segment paints ink-900
                  // and is intentionally not a link.
                  aria-current={isLast ? "page" : undefined}
                  className={
                    "break-words" +
                    (isLast ? " text-[var(--color-ink-900)]" : "")
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                // Slash glyph as a text separator — paints ink-300 to
                // sit visually back from both the link and the current
                // segment. aria-hidden so screen readers skip it.
                <span
                  aria-hidden="true"
                  className="select-none text-[var(--color-ink-300)]"
                >
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
