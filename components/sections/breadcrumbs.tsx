// Visible breadcrumbs above non-home pages. Pair with breadcrumbListJsonLd
// in lib/schema.ts so search engines see the same hierarchy.

import { ChevronRight } from "lucide-react";
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
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      {/* `gap-y-2` keeps the trail readable when crumbs wrap on a 360px
          phone. Each tappable crumb gets vertical padding so the row
          height clears the 32px tap-zone minimum even though the link
          text itself is small — full 44px isn't realistic here without
          ballooning the trail, and breadcrumbs are a secondary nav. */}
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  // py-1 + -my-1 gives a wider tap zone without changing
                  // the visual line height: the crumb stays where it is,
                  // the click area expands above and below.
                  className="-my-1 inline-flex min-h-8 items-center break-words py-1 transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  // The current page should not be a link.
                  // aria-current="page" tells assistive tech which crumb is the active one.
                  aria-current={isLast ? "page" : undefined}
                  className={
                    "break-words" +
                    (isLast ? " font-medium text-foreground" : "")
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
