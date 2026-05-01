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
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  // The current page should not be a link.
                  // aria-current="page" tells assistive tech which crumb is the active one.
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-foreground" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground/60"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
