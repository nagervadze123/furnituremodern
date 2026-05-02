/**
 * @deprecated Use `Banner` from `@/components/consent/banner` and the
 * helpers in `@/lib/consent` directly. This shim preserves the old
 * import paths so existing call sites (analytics layer, layout) keep
 * working through the migration. Remove in a follow-up commit once
 * every caller has been retargeted.
 */

export { Banner as CookieConsent } from "@/components/consent/banner";
export { useConsent } from "@/lib/consent";
export type { ConsentChoice as ConsentState } from "@/lib/consent";
