import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ga4Track } from "./providers/ga4";
import { gtmTrack } from "./providers/gtm";
import { metaTrack } from "./providers/meta";
import { plausibleTrack } from "./providers/plausible";
import type { Item } from "./types";

const ITEM: Item = {
  item_id: "p_1",
  item_name: "Linen Sofa",
  item_category: "sofas",
  price: 2400,
  currency: "GEL",
  item_brand: "Furnituremodern",
};

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    // @ts-expect-error — restore SSR-like state
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe("ga4Track", () => {
  it("is a no-op when window.gtag is missing", () => {
    // @ts-expect-error — stub
    globalThis.window = {};
    expect(() => ga4Track({ type: "view_item", item: ITEM })).not.toThrow();
  });

  it("forwards view_item to gtag with currency + value + items", () => {
    const gtag = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { gtag, location: { href: "https://x/y" } };
    ga4Track({ type: "view_item", item: ITEM });
    expect(gtag).toHaveBeenCalledTimes(1);
    const [cmd, name, params] = gtag.mock.calls[0];
    expect(cmd).toBe("event");
    expect(name).toBe("view_item");
    expect(params).toMatchObject({
      currency: "GEL",
      value: 2400,
      items: [
        expect.objectContaining({
          item_id: "p_1",
          item_name: "Linen Sofa",
          item_category: "sofas",
          item_brand: "Furnituremodern",
          price: 2400,
          currency: "GEL",
          quantity: 1,
        }),
      ],
    });
  });
});

describe("gtmTrack", () => {
  beforeEach(() => {
    // @ts-expect-error — stub
    globalThis.window = { dataLayer: [], location: { href: "https://x/y" } };
  });

  it("does nothing when dataLayer is missing", () => {
    // @ts-expect-error — stub
    globalThis.window = {};
    expect(() => gtmTrack({ type: "view_item", item: ITEM })).not.toThrow();
  });

  it("pushes ecommerce reset + view_item", () => {
    gtmTrack({ type: "view_item", item: ITEM });
    const dl = (globalThis.window as unknown as { dataLayer: unknown[] })
      .dataLayer;
    expect(dl).toHaveLength(2);
    expect(dl[0]).toEqual({ ecommerce: null });
    expect(dl[1]).toMatchObject({
      event: "view_item",
      ecommerce: {
        currency: "GEL",
        value: 2400,
        items: [expect.objectContaining({ item_id: "p_1" })],
      },
    });
  });
});

describe("metaTrack", () => {
  it("is a no-op without fbq", () => {
    // @ts-expect-error — stub
    globalThis.window = {};
    expect(() => metaTrack({ type: "view_item", item: ITEM })).not.toThrow();
  });

  it("emits a ViewContent event with content_ids and value", () => {
    const fbq = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { fbq };
    metaTrack({ type: "view_item", item: ITEM });
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "ViewContent",
      expect.objectContaining({
        content_ids: ["p_1"],
        currency: "GEL",
        value: 2400,
      })
    );
  });

  it("uses trackCustom for select_item (Meta has no native select event)", () => {
    const fbq = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { fbq };
    metaTrack({ type: "select_item", item: ITEM, list_name: "Sofas" });
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      "SelectItem",
      expect.objectContaining({ content_ids: ["p_1"], item_list_name: "Sofas" })
    );
  });
});

describe("plausibleTrack", () => {
  it("is a no-op without window.plausible", () => {
    // @ts-expect-error — stub
    globalThis.window = {};
    expect(() => plausibleTrack({ type: "view_item", item: ITEM })).not.toThrow();
  });

  it("emits ViewItem with props on view_item", () => {
    const plausible = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { plausible };
    plausibleTrack({ type: "view_item", item: ITEM });
    expect(plausible).toHaveBeenCalledWith(
      "ViewItem",
      expect.objectContaining({
        props: expect.objectContaining({
          item_id: "p_1",
          item_category: "sofas",
        }),
      })
    );
  });

  it("emits a manual pageview on page_view", () => {
    const plausible = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { plausible };
    plausibleTrack({
      type: "page_view",
      pathname: "/ka/sofas",
      locale: "ka",
    });
    expect(plausible).toHaveBeenCalledWith("pageview");
  });
});

describe("web_vitals event mapping", () => {
  it("ga4Track integerizes the value, multiplying CLS by 1000", () => {
    const gtag = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { gtag };

    ga4Track({
      type: "web_vitals",
      metric_name: "CLS",
      value: 0.0432,
      rating: "good",
      pathname: "/ka",
    });

    const [, name, params] = gtag.mock.calls[0];
    expect(name).toBe("web_vitals");
    expect(params.value).toBe(43); // round(0.0432 * 1000)
    expect(params.metric_name).toBe("CLS");
    expect(params.metric_rating).toBe("good");
    expect(params.non_interaction).toBe(true);
  });

  it("ga4Track rounds non-CLS values directly", () => {
    const gtag = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { gtag };

    ga4Track({
      type: "web_vitals",
      metric_name: "LCP",
      value: 2387.6,
      rating: "good",
      pathname: "/ka",
    });

    const [, , params] = gtag.mock.calls[0];
    expect(params.value).toBe(2388);
  });

  it("gtmTrack pushes a single web_vitals row to dataLayer", () => {
    const dataLayer: Array<Record<string, unknown>> = [];
    // @ts-expect-error — stub
    globalThis.window = { dataLayer };

    gtmTrack({
      type: "web_vitals",
      metric_name: "INP",
      value: 187,
      rating: "good",
      id: "v3-1",
      pathname: "/en/sofas",
    });

    // No ecommerce reset needed for vitals — exactly one row.
    expect(dataLayer.length).toBe(1);
    expect(dataLayer[0]).toMatchObject({
      event: "web_vitals",
      metric_name: "INP",
      metric_rating: "good",
      metric_id: "v3-1",
      value: 187,
      page_path: "/en/sofas",
    });
  });

  it("plausibleTrack emits a WebVitals custom event", () => {
    const plausible = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { plausible };

    plausibleTrack({
      type: "web_vitals",
      metric_name: "LCP",
      value: 2400,
      rating: "good",
      pathname: "/ka",
    });

    expect(plausible).toHaveBeenCalledWith(
      "WebVitals",
      expect.objectContaining({
        props: expect.objectContaining({
          metric_name: "LCP",
          rating: "good",
          value: 2400,
        }),
      })
    );
  });

  it("metaTrack is intentionally a no-op for web_vitals", () => {
    const fbq = vi.fn();
    // @ts-expect-error — stub
    globalThis.window = { fbq };

    metaTrack({
      type: "web_vitals",
      metric_name: "LCP",
      value: 2400,
      rating: "good",
      pathname: "/ka",
    });

    expect(fbq).not.toHaveBeenCalled();
  });
});
