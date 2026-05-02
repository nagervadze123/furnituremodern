// Public analytics API.
//
// `track(event)` is the only entry point components should use. It
// fans out to every enabled provider, gates on consent, and is
// guaranteed to never throw in user-facing runtime — every provider
// failure (missing script, locked-down browser, ad blocker) is
// swallowed silently.
//
// Provider activation rules:
//   • GTM enabled  → only GTM + Plausible fire (GA4/Meta direct skip)
//   • GTM disabled → GA4, Meta, Plausible each fire if their env var
//     is set
//   • No env vars → track() is a complete no-op
//
// Consent is read from the fm_consent cookie at dispatch time (lazy
// read) so a user accepting after page load immediately starts
// producing events without re-mounting components.

import type { AnalyticsEvent, Item } from "./types";
import { getAnalyticsConfig } from "./config";
import { ga4Track } from "./providers/ga4";
import { gtmTrack } from "./providers/gtm";
import { metaTrack } from "./providers/meta";
import { plausibleTrack } from "./providers/plausible";
import { readConsentFromBrowser } from "@/lib/consent";
import { siteConfig } from "@/lib/site-config";
import type { DataProduct } from "@/lib/data/types";
import type { Locale } from "@/i18n/routing";

export type { AnalyticsEvent, Item } from "./types";

// TODO(phase-6): marketing-class events gate on choice.marketing
function consentAllowsEvent(): boolean {
  // SSR / build-time: nothing accepted.
  if (typeof document === "undefined") return false;
  return readConsentFromBrowser()?.analytics === true;
}

export function track(event: AnalyticsEvent): void {
  if (!consentAllowsEvent()) return;
  const config = getAnalyticsConfig();

  // Each provider call is wrapped so a thrown SDK never breaks the
  // app surface (e.g. an ad-blocker that monkey-patches gtag).
  const safe = (label: string, fn: () => void) => {
    try {
      fn();
    } catch (err) {
      console.debug(`[analytics] ${label} provider threw`, err);
    }
  };

  if (config.enabled.gtm) safe("gtm", () => gtmTrack(event));
  if (config.enabled.ga4) safe("ga4", () => ga4Track(event));
  if (config.enabled.meta) safe("meta", () => metaTrack(event));
  if (config.enabled.plausible) safe("plausible", () => plausibleTrack(event));
}

// Convert a DataProduct row to the Item shape every event uses.
// Centralizing here keeps the brand string and id-fallback consistent.
export function productToItem(product: DataProduct, locale: Locale): Item {
  return {
    item_id: product.id || product.slug,
    item_name: product.name[locale],
    item_category: product.category,
    price: product.price,
    currency: product.currency,
    item_brand: siteConfig.name,
  };
}
