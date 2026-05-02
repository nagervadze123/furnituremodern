"use client";

// Fires a `page_view` analytics event on every client-side route change.
//
// The first-load page_view is also fired here so the dispatch path is
// uniform — providers' own first-load auto-tracking is disabled in the
// loader (GA4: send_page_view: false, Plausible: manual.js). This means
// every page_view always carries the same payload regardless of how
// the visitor arrived.
//
// Mounted once from app/[locale]/layout.tsx.

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useConsent } from "@/lib/consent";
import { track } from "@/lib/analytics";

type Props = {
  locale: string;
};

export function PageViewTracker({ locale }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { choice } = useConsent();
  const search = searchParams?.toString() ?? "";

  useEffect(() => {
    // track() itself gates on consent — repeating the gate here lets
    // the effect dependency array stay tight without firing a stale
    // event between consent flip and provider load.
    if (choice?.analytics !== true) return;
    track({
      type: "page_view",
      pathname,
      search: search ? `?${search}` : "",
      locale,
    });
  }, [pathname, search, locale, choice?.analytics]);

  return null;
}
