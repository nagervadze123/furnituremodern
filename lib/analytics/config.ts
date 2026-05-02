// Reads the public env vars and resolves which providers are active.
//
// Provider rules (per task spec):
//   • GTM trumps direct GA4 + direct Meta. If NEXT_PUBLIC_GTM_ID is
//     set, GA4/Meta direct loaders/events skip — GTM owns those tags
//     inside its container.
//   • Plausible runs independently of GTM mode.
//   • A missing env var silently disables the provider.
//
// `readAnalyticsConfig` is pure and takes the env map as input so it
// can be unit-tested against synthetic envs without touching process.env.

export type AnalyticsConfig = {
  ga4Id: string | null;
  gtmId: string | null;
  metaPixelId: string | null;
  plausibleDomain: string | null;
  enabled: {
    gtm: boolean;
    ga4: boolean;
    meta: boolean;
    plausible: boolean;
  };
};

type EnvLike = Partial<Record<string, string | undefined>>;

function nonEmpty(v: string | undefined): string | null {
  return v && v.trim().length > 0 ? v.trim() : null;
}

export function readAnalyticsConfig(env: EnvLike): AnalyticsConfig {
  const ga4Id = nonEmpty(env.NEXT_PUBLIC_GA4_MEASUREMENT_ID);
  const gtmId = nonEmpty(env.NEXT_PUBLIC_GTM_ID);
  const metaPixelId = nonEmpty(env.NEXT_PUBLIC_META_PIXEL_ID);
  const plausibleDomain = nonEmpty(env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);

  const gtmActive = gtmId !== null;
  return {
    ga4Id,
    gtmId,
    metaPixelId,
    plausibleDomain,
    enabled: {
      gtm: gtmActive,
      ga4: ga4Id !== null && !gtmActive,
      meta: metaPixelId !== null && !gtmActive,
      plausible: plausibleDomain !== null,
    },
  };
}

// Cached read of process.env, evaluated once on first call. The public
// vars are inlined into the bundle by Next at build time, so this is
// a constant per deploy.
let cached: AnalyticsConfig | null = null;
export function getAnalyticsConfig(): AnalyticsConfig {
  if (cached) return cached;
  cached = readAnalyticsConfig({
    NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  });
  return cached;
}

// Test-only — flush the cache between tests.
export function _resetAnalyticsConfigCache(): void {
  cached = null;
}
