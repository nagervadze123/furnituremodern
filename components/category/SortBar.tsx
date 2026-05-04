"use client";

// Tiny sort dropdown for the category grid. Phase 5 Task 5 follow-up.
//
// Three options: newest, price ascending, price descending. The bar
// updates the `?sort=` query param via router.replace; the page reads
// searchParams server-side and re-orders the products before rendering.
//
// Implemented as a client island so the change handler can drive
// navigation, but it degrades gracefully — the component is wrapped in
// a <form method="GET"> so even with JS disabled the visitor can still
// submit a sort choice (the form Submit fires the same nav).
//
// We use a native <select> rather than a custom dropdown because the
// option list is short, the native control is fully accessible
// out-of-the-box, and it tracks system preferences (e.g. dark mode
// option highlighting) without extra work.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useTransition } from "react";

import type { SortKey } from "./sort-keys";

type Props = {
  /** Currently active sort key (resolved server-side). */
  current?: SortKey;
};

export function SortBar({ current = "newest" }: Props) {
  const t = useTranslations("category.sort");
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const selectId = useId();

  const setSort = (next: SortKey) => {
    const sp = new URLSearchParams(params);
    if (next === "newest") {
      sp.delete("sort");
    } else {
      sp.set("sort", next);
    }
    const qs = sp.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  return (
    <form
      method="GET"
      action={pathname}
      className="flex items-center justify-end gap-3"
      onSubmit={(e) => {
        // JS path: navigate via router.replace and stop the native nav
        // (which would do a full reload). The native nav is the no-JS
        // fallback — it still goes to the right URL.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const next = (data.get("sort") as SortKey | null) ?? "newest";
        setSort(next);
      }}
    >
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-muted-foreground"
      >
        {t("label")}
      </label>
      <select
        id={selectId}
        name="sort"
        defaultValue={current}
        onChange={(e) => setSort(e.currentTarget.value as SortKey)}
        className="min-h-9 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:border-foreground/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <option value="newest">{t("newest")}</option>
        <option value="price-asc">{t("price_asc")}</option>
        <option value="price-desc">{t("price_desc")}</option>
      </select>
      {/* Hidden submit so no-JS visitors still submit the form on
          select change via Enter / native form-submit fallback. */}
      <noscript>
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {t("apply")}
        </button>
      </noscript>
    </form>
  );
}
