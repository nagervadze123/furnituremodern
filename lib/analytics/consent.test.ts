import { describe, it, expect, vi, afterEach } from "vitest";
import type { ConsentChoice } from "@/lib/consent";
import { consentToMode, updateGtagConsent } from "./consent";

const TS = "2026-05-02T00:00:00.000Z";

describe("consentToMode", () => {
  it("denies non-essential signals when consent is undecided (null)", () => {
    const mode = consentToMode(null);
    expect(mode.analytics_storage).toBe("denied");
    expect(mode.ad_storage).toBe("denied");
    expect(mode.ad_user_data).toBe("denied");
    expect(mode.ad_personalization).toBe("denied");
    expect(mode.functionality_storage).toBe("denied");
    expect(mode.personalization_storage).toBe("denied");
    expect(mode.security_storage).toBe("granted");
  });

  it("denies everything when both categories are false", () => {
    const choice: ConsentChoice = {
      analytics: false,
      marketing: false,
      updatedAt: TS,
    };
    const mode = consentToMode(choice);
    expect(mode.analytics_storage).toBe("denied");
    expect(mode.ad_storage).toBe("denied");
    expect(mode.ad_user_data).toBe("denied");
    expect(mode.ad_personalization).toBe("denied");
    expect(mode.functionality_storage).toBe("denied");
    expect(mode.personalization_storage).toBe("denied");
    expect(mode.security_storage).toBe("granted");
  });

  it("grants analytics-class signals when analytics:true, marketing:false", () => {
    const choice: ConsentChoice = {
      analytics: true,
      marketing: false,
      updatedAt: TS,
    };
    const mode = consentToMode(choice);
    expect(mode.analytics_storage).toBe("granted");
    expect(mode.functionality_storage).toBe("granted");
    expect(mode.personalization_storage).toBe("granted");
    expect(mode.ad_storage).toBe("denied");
    expect(mode.ad_user_data).toBe("denied");
    expect(mode.ad_personalization).toBe("denied");
    expect(mode.security_storage).toBe("granted");
  });

  it("grants ad signals when analytics:false, marketing:true", () => {
    const choice: ConsentChoice = {
      analytics: false,
      marketing: true,
      updatedAt: TS,
    };
    const mode = consentToMode(choice);
    expect(mode.ad_storage).toBe("granted");
    expect(mode.ad_user_data).toBe("granted");
    expect(mode.ad_personalization).toBe("granted");
    expect(mode.analytics_storage).toBe("denied");
    expect(mode.functionality_storage).toBe("denied");
    expect(mode.personalization_storage).toBe("denied");
    expect(mode.security_storage).toBe("granted");
  });

  it("grants every non-essential signal when both categories are true", () => {
    const choice: ConsentChoice = {
      analytics: true,
      marketing: true,
      updatedAt: TS,
    };
    const mode = consentToMode(choice);
    expect(mode.analytics_storage).toBe("granted");
    expect(mode.ad_storage).toBe("granted");
    expect(mode.ad_user_data).toBe("granted");
    expect(mode.ad_personalization).toBe("granted");
    expect(mode.functionality_storage).toBe("granted");
    expect(mode.personalization_storage).toBe("granted");
    expect(mode.security_storage).toBe("granted");
  });
});

describe("updateGtagConsent", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error — restore SSR-like state
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it("is a no-op when window is undefined (SSR)", () => {
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
    expect(() => updateGtagConsent(consentToMode(null))).not.toThrow();
  });

  it("is a no-op when gtag is not on window", () => {
    // @ts-expect-error — minimal window stub
    globalThis.window = {};
    expect(() => updateGtagConsent(consentToMode(null))).not.toThrow();
  });

  it("calls gtag('consent', 'update', mode) when gtag is present", () => {
    const gtag = vi.fn();
    // @ts-expect-error — minimal window stub
    globalThis.window = { gtag };
    const mode = consentToMode({
      analytics: true,
      marketing: true,
      updatedAt: TS,
    });
    updateGtagConsent(mode);
    expect(gtag).toHaveBeenCalledWith("consent", "update", mode);
  });
});
