// Locale-aware formatting helpers. Pure functions, no side effects;
// safe to import from server and client components alike.

import type { Locale } from "@/i18n/routing";

/**
 * Format a price as a localized currency string.
 *
 * Uses the BCP 47 tag matching each locale (`ka-GE` for Georgian, `en-US`
 * for English) so number grouping and currency symbol placement match
 * native conventions.
 *
 * @param amount   Whole units, no fractional cents (e.g. 2400 means ₾2,400).
 * @param currency Currency code today is always "GEL"; widen the union here
 *                 if you ever sell in additional currencies.
 * @param locale   The active locale ("ka" or "en").
 */
export function formatPrice(
  amount: number,
  currency: "GEL",
  locale: Locale
): string {
  const formatter = new Intl.NumberFormat(
    locale === "ka" ? "ka-GE" : "en-US",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  );
  return formatter.format(amount);
}
