// Granular cookie consent shape. Persisted as JSON in the fm_consent
// cookie. "Necessary" cookies are implicit (always allowed) per
// GDPR/ePrivacy and are not represented as a toggle in this object.
export type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  // ISO 8601 timestamp of the most recent decision. Used by the UI to
  // surface a "last updated" line and (later) to expire stale cookies
  // for re-consent.
  updatedAt: string;
};

// High-level decisions the banner offers. "custom" means the user is
// using the settings sheet to set per-category booleans explicitly,
// "not-decided" is the no-op default before any UI interaction.
export type ConsentDecision =
  | "accept-all"
  | "necessary-only"
  | "custom"
  | "not-decided";

// Cookie name. Must match the SSR reader in middleware/route handlers.
// Underscored — the legacy localStorage key was "fm-consent" (hyphen).
export const CONSENT_COOKIE_NAME = "fm_consent" as const;

// 1 year in seconds. Per ICO/CNIL guidance, consent cookies should
// not exceed 13 months without re-prompting the user.
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
