import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { track, productToItem } from "./index";
import { _resetAnalyticsConfigCache } from "./config";
import type { Item } from "./types";

const _ = _resetAnalyticsConfigCache;

const ITEM: Item = {
  item_id: "p_1",
  item_name: "Linen Sofa",
  item_category: "sofas",
  price: 2400,
  currency: "GEL",
  item_brand: "Furnituremodern",
};

// Build a fake window with stubbed localStorage + provider globals.
// Each test resets it explicitly so cross-test pollution can't happen.
function setupWindow(opts: {
  consent: string | null;
  gtag?: ReturnType<typeof vi.fn>;
  dataLayer?: unknown[];
  fbq?: ReturnType<typeof vi.fn>;
  plausible?: ReturnType<typeof vi.fn>;
}) {
  const w: Record<string, unknown> = {
    location: { href: "https://example.com/test" },
    localStorage: {
      getItem: (k: string) => (k === "fm-consent" ? opts.consent : null),
      setItem: () => {},
      removeItem: () => {},
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  if (opts.gtag) w.gtag = opts.gtag;
  if (opts.dataLayer) w.dataLayer = opts.dataLayer;
  if (opts.fbq) w.fbq = opts.fbq;
  if (opts.plausible) w.plausible = opts.plausible;
  // @ts-expect-error — assign synthetic window
  globalThis.window = w;
}

const originalWindow = globalThis.window;

beforeEach(() => {
  vi.unstubAllEnvs();
  _();
});

afterEach(() => {
  if (originalWindow === undefined) {
    // @ts-expect-error — restore SSR-like state
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  vi.unstubAllEnvs();
  _();
});

describe("track() consent gating", () => {
  it("fires nothing when consent is undecided", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-A");
    const dataLayer: unknown[] = [];
    setupWindow({ consent: null, dataLayer });
    track({ type: "view_item", item: ITEM });
    expect(dataLayer).toHaveLength(0);
  });

  it("fires nothing when consent is declined", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-A");
    const dataLayer: unknown[] = [];
    setupWindow({ consent: "declined", dataLayer });
    track({ type: "view_item", item: ITEM });
    expect(dataLayer).toHaveLength(0);
  });

  it("fires nothing when no providers are configured", () => {
    const gtag = vi.fn();
    setupWindow({ consent: "accepted", gtag });
    track({ type: "view_item", item: ITEM });
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("track() fan-out by env", () => {
  it("with GTM unset: GA4 fires direct + Plausible fires", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-A");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "x.com");
    const gtag = vi.fn();
    const plausible = vi.fn();
    setupWindow({ consent: "accepted", gtag, plausible });
    track({ type: "view_item", item: ITEM });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledTimes(1);
  });

  it("with GTM set: GA4 + Meta direct skip, GTM owns the event", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-A");
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-A");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "12345");
    const gtag = vi.fn();
    const fbq = vi.fn();
    const dataLayer: unknown[] = [];
    setupWindow({ consent: "accepted", gtag, fbq, dataLayer });
    track({ type: "view_item", item: ITEM });
    expect(gtag).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
    // dataLayer gets the ecommerce reset + the view_item push
    expect(dataLayer.length).toBe(2);
  });

  it("with GTM set: Plausible still fires when its env var is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-A");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "x.com");
    const dataLayer: unknown[] = [];
    const plausible = vi.fn();
    setupWindow({ consent: "accepted", dataLayer, plausible });
    track({ type: "view_item", item: ITEM });
    expect(plausible).toHaveBeenCalledTimes(1);
  });

  it("provider that throws does not break the fan-out", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-A");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "x.com");
    const gtag = vi.fn(() => {
      throw new Error("ad-blocker hijacked gtag");
    });
    const plausible = vi.fn();
    setupWindow({ consent: "accepted", gtag, plausible });
    expect(() => track({ type: "view_item", item: ITEM })).not.toThrow();
    expect(plausible).toHaveBeenCalledTimes(1);
  });
});

describe("productToItem", () => {
  it("maps a DataProduct to the Item shape with brand and category", () => {
    const item = productToItem(
      {
        id: "uuid-1",
        slug: "linen-sofa",
        category: "sofas",
        name: { ka: "სოფა", en: "Linen Sofa" },
        description: { ka: "", en: "" },
        price: 2400,
        currency: "GEL",
        images: [],
      },
      "en"
    );
    expect(item.item_id).toBe("uuid-1");
    expect(item.item_name).toBe("Linen Sofa");
    expect(item.item_category).toBe("sofas");
    expect(item.price).toBe(2400);
    expect(item.currency).toBe("GEL");
    expect(item.item_brand).toBeTruthy();
  });

  it("falls back to slug as item_id when id is missing (offline catalog)", () => {
    const item = productToItem(
      {
        id: "",
        slug: "linen-sofa",
        category: "sofas",
        name: { ka: "სოფა", en: "Linen Sofa" },
        description: { ka: "", en: "" },
        price: 0,
        currency: "GEL",
        images: [],
      },
      "ka"
    );
    expect(item.item_id).toBe("linen-sofa");
  });
});
