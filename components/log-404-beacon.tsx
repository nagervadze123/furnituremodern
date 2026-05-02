"use client";

// Fire-and-forget beacon that posts the current pathname to
// /api/log-404 so the SEO dashboard can rank the most-hit missing
// paths. Mounted from app/[locale]/not-found.tsx — runs once per
// 404 render in the user's browser.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Log404Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    void fetch("/api/log-404", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        locale: pathname.split("/")[1] || null,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
