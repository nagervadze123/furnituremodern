// Maps the granular fm_consent ConsentChoice to Google Consent Mode v2
// signals. `null` means "no choice yet" and produces all-denied (the
// pre-consent default). `analytics` toggles analytics_storage; the
// `marketing` boolean toggles ad_storage / ad_user_data /
// ad_personalization. functionality_storage and personalization_storage
// are tied to analytics today (we only ship analytics-class storage —
// no separate functional or personalization category in the UI), and
// security_storage is always granted per the spec.
//
// `updateGtagConsent` only fires if `gtag` is already on window — we
// never load gtag.js purely to deliver a consent update. The usual
// caller is the GA4 or GTM provider, both of which load gtag first.

import type { ConsentChoice } from "@/lib/consent";

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

export function consentToMode(choice: ConsentChoice | null): ConsentMode {
  const analytics = choice?.analytics === true;
  const marketing = choice?.marketing === true;
  return {
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
    analytics_storage: analytics ? "granted" : "denied",
    functionality_storage: analytics ? "granted" : "denied",
    personalization_storage: analytics ? "granted" : "denied",
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
