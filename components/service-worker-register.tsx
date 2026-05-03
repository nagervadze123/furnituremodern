"use client";

// Tiny client-side registrar for /sw.js.
//
// Mounted once from app/[locale]/layout.tsx. Renders nothing.
//
// Behaviour:
//   - Production: register /sw.js with origin scope.
//   - Non-production: actively unregister any leftover SWs so devs never
//     debug a stale-cache mystery. (Browsers cache SWs aggressively; if
//     a previous build registered one, even removing it from prod won't
//     unregister installed copies until they expire — better to unwire
//     them on every dev page load.)
//
// Failures are swallowed: a broken SW must never block the app.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {
          /* swallow */
        });
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* swallow — SW failure must never break the app */
    });
  }, []);

  return null;
}
