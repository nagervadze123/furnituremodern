// Maps the existing fm-consent cookie/localStorage shape to Google
// Consent Mode v2 signals.
//
// The current consent system is binary ("accepted" | "declined" | null).
// Per spec: analytics, marketing, and functional categories all map to
// that single accepted-state until the consent UI grows category-level
// toggles. `security_storage` is always granted.
//
// `updateGtagConsent` only fires if `gtag` is already on window — we
// never load gtag.js purely to deliver a consent update. The usual
// caller is the GA4 or GTM provider, both of which load gtag first.

import type { ConsentState } from "@/components/cookie-consent";

export type ConsentSignal = "granted" | "denied";

export type ConsentMode = {
  ad_storage: ConsentSignal;
  ad_user_data: ConsentSignal;
  ad_personalization: ConsentSignal;
  analytics_storage: ConsentSignal;
  functionality_storage: ConsentSignal;
  personalization_storage: ConsentSignal;
  security_storage: "granted";
};

export function consentToMode(consent: ConsentState | null): ConsentMode {
  const accepted = consent === "accepted";
  return {
    ad_storage: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
    ad_personalization: accepted ? "granted" : "denied",
    analytics_storage: accepted ? "granted" : "denied",
    functionality_storage: accepted ? "granted" : "denied",
    personalization_storage: accepted ? "granted" : "denied",
    security_storage: "granted",
  };
}

type GtagFn = (
  command: "consent",
  action: "default" | "update",
  params: ConsentMode
) => void;

export function updateGtagConsent(mode: ConsentMode): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: GtagFn };
  if (typeof w.gtag !== "function") return;
  w.gtag("consent", "update", mode);
}
