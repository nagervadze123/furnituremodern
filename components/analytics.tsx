"use client";

// Privacy-respecting analytics placeholder.
//
// Renders nothing unless BOTH conditions hold:
//   1. NEXT_PUBLIC_ANALYTICS_DOMAIN is configured.
//   2. The visitor has accepted cookies in <CookieConsent />.
//
// Replace the inert <script> below with whatever provider you use
// (Plausible, Fathom, Umami, etc.). Wiring it through this gate keeps
// the rest of the app from accidentally calling tracking before consent.

import Script from "next/script";
import { useConsent } from "./cookie-consent";

const ANALYTICS_DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

export function Analytics() {
  const consent = useConsent();
  if (!ANALYTICS_DOMAIN || consent !== "accepted") return null;

  // Inert placeholder: emits a single console.debug rather than calling
  // a real network endpoint. Swap for a provider-specific <Script /> tag.
  return (
    <Script
      id="fm-analytics"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `console.debug("[analytics] consented; domain=${ANALYTICS_DOMAIN}");`,
      }}
    />
  );
}
