"use client";

// Phase 6 Slice 6 editorial port. Three sort options rendered as a
// row of inline anchors (newest / price ascending / price descending)
// instead of the previous native <select>. The active key paints
// `text-[var(--color-ink-900)]` with a 1 px ink-900 underline;
// inactive keys paint `text-[var(--color-ink-700)]`. No terracotta
// on text — the editorial accent colour stays out of category UI
// per the canonical use rule in `docs/design/contrast.md`.
//
// Each option is a real `<a href="?sort=…">` anchor so the no-JS
// fallback is genuinely native: with JavaScript disabled the click
// is a full GET, the page re-renders with the new sort param, and
// the visitor lands at the same URL the JS path would have produced.
// With JavaScript on, an `onClick` handler intercepts the navigation
// and swaps via `router.replace` inside `useTransition` for a smooth
// shallow nav (no full page reload, no scroll jump).
//
// The label sits to the left of the option row; on small screens the
// label drops above the row so the sort line never overflows.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import { SORT_KEYS, type SortKey } from "./sort-keys";

type Props = {
  /** Currently active sort key (resolved server-side). */
  current?: SortKey;
};

const SORT_LABEL_KEY: Record<SortKey, string> = {
  newest: "newest",
  "price-asc": "price_asc",
  "price-desc": "price_desc",
};

export function SortBar({ current = "newest" }: Props) {
  const t = useTranslations("category.sort");
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Build the href for a given sort key. "newest" is the default
  // sort, so we omit the param entirely on the canonical URL — keeps
  // the bare /[locale]/[category] path as the canonical form.
  const hrefFor = (key: SortKey): string => {
    const sp = new URLSearchParams(params);
    if (key === "newest") {
      sp.delete("sort");
    } else {
      sp.set("sort", key);
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const navigate = (key: SortKey) => {
    startTransition(() => {
      router.replace(hrefFor(key), { scroll: false });
    });
  };

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-baseline sm:justify-end sm:gap-6">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
        {t("label")}
      </span>
      <div
        role="group"
        aria-label={t("label")}
        className="flex flex-wrap items-baseline gap-x-5 gap-y-2"
      >
        {SORT_KEYS.map((key) => {
          const isActive = key === current;
          return (
            <a
              key={key}
              href={hrefFor(key)}
              aria-current={isActive ? "true" : undefined}
              onClick={(e) => {
                // Honor modifier-clicks (open in new tab, etc.) and
                // non-primary buttons by letting the native nav take
                // over — the same ergonomic any anchor exposes.
                if (
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                ) {
                  return;
                }
                e.preventDefault();
                navigate(key);
              }}
              className={cn(
                "text-sm font-medium tracking-tight transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink-900)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bone-50)]",
                isActive
                  ? "text-[var(--color-ink-900)] underline decoration-[var(--color-ink-900)] decoration-1 underline-offset-[6px]"
                  : "text-[var(--color-ink-700)] hover:text-[var(--color-ink-900)]"
              )}
            >
              {t(SORT_LABEL_KEY[key])}
            </a>
          );
        })}
      </div>
    </div>
  );
}
