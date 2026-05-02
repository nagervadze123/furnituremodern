import { describe, it, expect } from "vitest";
import { readAnalyticsConfig } from "./config";

describe("readAnalyticsConfig", () => {
  it("returns all-disabled when no env vars are set", () => {
    const c = readAnalyticsConfig({});
    expect(c.enabled).toEqual({
      gtm: false,
      ga4: false,
      meta: false,
      plausible: false,
    });
    expect(c.ga4Id).toBeNull();
  });

  it("treats whitespace-only env vars as disabled", () => {
    const c = readAnalyticsConfig({
      NEXT_PUBLIC_GA4_MEASUREMENT_ID: "   ",
      NEXT_PUBLIC_GTM_ID: "",
    });
    expect(c.enabled.ga4).toBe(false);
    expect(c.enabled.gtm).toBe(false);
  });

  it("enables GA4 + Meta + Plausible when GTM is unset", () => {
    const c = readAnalyticsConfig({
      NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-ABC",
      NEXT_PUBLIC_META_PIXEL_ID: "12345",
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "example.com",
    });
    expect(c.enabled.ga4).toBe(true);
    expect(c.enabled.meta).toBe(true);
    expect(c.enabled.plausible).toBe(true);
    expect(c.enabled.gtm).toBe(false);
  });

  it("disables direct GA4 + Meta when GTM is set, but keeps Plausible", () => {
    const c = readAnalyticsConfig({
      NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-ABC",
      NEXT_PUBLIC_GTM_ID: "GTM-XYZ",
      NEXT_PUBLIC_META_PIXEL_ID: "12345",
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "example.com",
    });
    expect(c.enabled.gtm).toBe(true);
    expect(c.enabled.ga4).toBe(false);
    expect(c.enabled.meta).toBe(false);
    expect(c.enabled.plausible).toBe(true);
  });

  it("preserves the trimmed env values", () => {
    const c = readAnalyticsConfig({
      NEXT_PUBLIC_GTM_ID: "  GTM-ABC  ",
    });
    expect(c.gtmId).toBe("GTM-ABC");
  });
});
