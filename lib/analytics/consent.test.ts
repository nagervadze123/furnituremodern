import { describe, it, expect, vi, afterEach } from "vitest";
import { consentToMode, updateGtagConsent } from "./consent";

describe("consentToMode", () => {
  it("grants every signal when consent is accepted", () => {
    const mode = consentToMode("accepted");
    expect(mode.analytics_storage).toBe("granted");
    expect(mode.ad_storage).toBe("granted");
    expect(mode.ad_user_data).toBe("granted");
    expect(mode.ad_personalization).toBe("granted");
    expect(mode.functionality_storage).toBe("granted");
    expect(mode.personalization_storage).toBe("granted");
    expect(mode.security_storage).toBe("granted");
  });

  it("denies non-essential signals when consent is declined", () => {
    const mode = consentToMode("declined");
    expect(mode.analytics_storage).toBe("denied");
    expect(mode.ad_storage).toBe("denied");
    expect(mode.ad_user_data).toBe("denied");
    expect(mode.ad_personalization).toBe("denied");
    expect(mode.functionality_storage).toBe("denied");
    expect(mode.personalization_storage).toBe("denied");
    expect(mode.security_storage).toBe("granted");
  });

  it("denies non-essential signals when consent is undecided (null)", () => {
    const mode = consentToMode(null);
    expect(mode.analytics_storage).toBe("denied");
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
    expect(() => updateGtagConsent(consentToMode("accepted"))).not.toThrow();
  });

  it("is a no-op when gtag is not on window", () => {
    // @ts-expect-error — minimal window stub
    globalThis.window = {};
    expect(() => updateGtagConsent(consentToMode("accepted"))).not.toThrow();
  });

  it("calls gtag('consent', 'update', mode) when gtag is present", () => {
    const gtag = vi.fn();
    // @ts-expect-error — minimal window stub
    globalThis.window = { gtag };
    const mode = consentToMode("accepted");
    updateGtagConsent(mode);
    expect(gtag).toHaveBeenCalledWith("consent", "update", mode);
  });
});
