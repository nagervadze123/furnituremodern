import { describe, it, expect } from "vitest";
import {
  VitalsPayloadSchema,
  isBotUserAgent,
  isWithinSanity,
  deriveDeviceType,
  sanitizePathname,
  honorsPrivacySignal,
} from "./vitals";

describe("VitalsPayloadSchema", () => {
  const valid = {
    name: "LCP" as const,
    value: 2400,
    rating: "good" as const,
    pathname: "/ka/sofas/iris",
  };

  it("accepts a minimal valid payload", () => {
    expect(VitalsPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all five Web Vitals metric names", () => {
    for (const name of ["CLS", "INP", "LCP", "FCP", "TTFB"] as const) {
      expect(
        VitalsPayloadSchema.safeParse({ ...valid, name }).success
      ).toBe(true);
    }
  });

  it("rejects an unknown metric name", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, name: "FID" }).success
    ).toBe(false);
  });

  it("rejects an unknown rating", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, rating: "great" }).success
    ).toBe(false);
  });

  it("rejects NaN value", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, value: NaN }).success
    ).toBe(false);
  });

  it("rejects Infinity value", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, value: Infinity }).success
    ).toBe(false);
  });

  it("rejects an empty pathname", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, pathname: "" }).success
    ).toBe(false);
  });

  it("rejects pathname over 4096 chars", () => {
    expect(
      VitalsPayloadSchema.safeParse({
        ...valid,
        pathname: "/" + "a".repeat(4096),
      }).success
    ).toBe(false);
  });

  it("rejects locale outside the allowlist", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, locale: "fr" }).success
    ).toBe(false);
  });

  it("accepts optional delta as a finite number", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, delta: 12.3 }).success
    ).toBe(true);
  });

  it("rejects optional delta when NaN", () => {
    expect(
      VitalsPayloadSchema.safeParse({ ...valid, delta: NaN }).success
    ).toBe(false);
  });
});

describe("isBotUserAgent", () => {
  it("matches Googlebot", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      )
    ).toBe(true);
  });

  it("matches Bingbot, AhrefsBot, SemrushBot", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (AhrefsBot/7.0)")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (SemrushBot/7~bl)")).toBe(true);
  });

  it("matches generic crawler/spider tokens", () => {
    expect(isBotUserAgent("OurCustomCrawler/1.0")).toBe(true);
    expect(isBotUserAgent("WebSpider 1.4")).toBe(true);
  });

  it("matches the explicit 'crawler' / 'spider' / 'bot ' tokens", () => {
    // Curated list, not exhaustive. \bbot\b requires word boundaries
    // on both sides — so "Mozilla bot/1.0" matches, but CamelCase
    // pseudonyms like FooBot or Hubot aren't picked up. Per spec,
    // a few unfiltered custom-named bots are tolerable.
    expect(isBotUserAgent("Mozilla bot/1.0")).toBe(true);
    expect(isBotUserAgent("FooBot/1.0")).toBe(false);
    expect(isBotUserAgent("Hubot/1.0")).toBe(false);
  });

  it("does not match a real Chrome desktop UA", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });

  it("does not match a real iPhone Safari UA", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1"
      )
    ).toBe(false);
  });

  it("treats null/undefined UA as non-bot (rate limit + privacy still apply)", () => {
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
  });
});

describe("deriveDeviceType", () => {
  it("buckets iPhone Safari as mobile", () => {
    expect(
      deriveDeviceType(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1"
      )
    ).toBe("mobile");
  });

  it("buckets Android Chrome (with Mobile) as mobile", () => {
    expect(
      deriveDeviceType(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
      )
    ).toBe("mobile");
  });

  it("buckets iPad as tablet", () => {
    expect(
      deriveDeviceType(
        "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15"
      )
    ).toBe("tablet");
  });

  it("buckets Android tablet (no Mobile token) as tablet", () => {
    expect(
      deriveDeviceType(
        "Mozilla/5.0 (Linux; Android 14; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
      )
    ).toBe("tablet");
  });

  it("buckets desktop Chrome as desktop", () => {
    expect(
      deriveDeviceType(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe("desktop");
  });

  it("returns null when UA is missing", () => {
    expect(deriveDeviceType(null)).toBe(null);
    expect(deriveDeviceType(undefined)).toBe(null);
    expect(deriveDeviceType("")).toBe(null);
  });
});

describe("sanitizePathname", () => {
  it("strips the query string", () => {
    expect(sanitizePathname("/ka/search?q=sofa&utm=email")).toBe("/ka/search");
  });

  it("strips the fragment", () => {
    expect(sanitizePathname("/ka/sofas/iris#review")).toBe("/ka/sofas/iris");
  });

  it("clamps to 2048 chars", () => {
    const long = "/" + "a".repeat(3000);
    expect(sanitizePathname(long).length).toBe(2048);
  });

  it("passes through clean pathnames untouched", () => {
    expect(sanitizePathname("/ka/sofas/iris")).toBe("/ka/sofas/iris");
  });
});

describe("isWithinSanity", () => {
  it("accepts reasonable values for each metric", () => {
    expect(isWithinSanity("LCP", 2400)).toBe(true);
    expect(isWithinSanity("INP", 180)).toBe(true);
    expect(isWithinSanity("CLS", 0.05)).toBe(true);
    expect(isWithinSanity("FCP", 1200)).toBe(true);
    expect(isWithinSanity("TTFB", 600)).toBe(true);
  });

  it("rejects negative values", () => {
    expect(isWithinSanity("LCP", -1)).toBe(false);
  });

  it("rejects values above the per-metric extreme cap", () => {
    expect(isWithinSanity("LCP", 60_001)).toBe(false);
    expect(isWithinSanity("INP", 60_001)).toBe(false);
    expect(isWithinSanity("CLS", 5.01)).toBe(false);
  });

  it("rejects NaN/Infinity", () => {
    expect(isWithinSanity("LCP", NaN)).toBe(false);
    expect(isWithinSanity("CLS", Infinity)).toBe(false);
  });
});

describe("honorsPrivacySignal", () => {
  it("returns true when Sec-GPC=1", () => {
    const h = new Headers({ "sec-gpc": "1" });
    expect(honorsPrivacySignal(h)).toBe(true);
  });

  it("returns true when DNT=1", () => {
    const h = new Headers({ DNT: "1" });
    expect(honorsPrivacySignal(h)).toBe(true);
  });

  it("returns false when neither is set", () => {
    expect(honorsPrivacySignal(new Headers())).toBe(false);
  });

  it("returns false when Sec-GPC is set to 0", () => {
    const h = new Headers({ "sec-gpc": "0" });
    expect(honorsPrivacySignal(h)).toBe(false);
  });
});
