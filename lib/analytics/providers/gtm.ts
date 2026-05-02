// GTM provider — pushes typed payloads onto window.dataLayer so a
// Google Tag Manager container can fan them out to GA4, Ads, Floodlight,
// etc. without site code knowing about each downstream tag.
//
// Active when NEXT_PUBLIC_GTM_ID is set; in that mode the direct GA4
// and direct Meta providers are skipped (the GTM container takes over).

import type { AnalyticsEvent, Item } from "../types";

type DataLayer = Array<Record<string, unknown>>;

function getDataLayer(): DataLayer | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { dataLayer?: DataLayer };
  if (!Array.isArray(w.dataLayer)) {
    // The GTM snippet always initializes dataLayer; if it's missing we
    // assume the snippet hasn't loaded yet. Skip silently — the
    // analytics layer never throws in user runtime.
    return null;
  }
  return w.dataLayer;
}

function toGtmItem(item: Item, defaultQty = 1): Record<string, unknown> {
  return {
    item_id: item.item_id,
    item_name: item.item_name,
    item_category: item.item_category,
    item_brand: item.item_brand,
    price: item.price,
    currency: item.currency,
    quantity: item.quantity ?? defaultQty,
  };
}

export function gtmTrack(event: AnalyticsEvent): void {
  const dl = getDataLayer();
  if (!dl) return;

  // The "ecommerce: null" reset between pushes is a GTM idiom — it
  // prevents the previous event's items array from polluting the next
  // tag's evaluation when both reference {{Ecommerce Items}}.
  switch (event.type) {
    case "page_view":
      dl.push({
        event: "page_view",
        page_path: event.pathname + (event.search ?? ""),
        page_location:
          typeof window !== "undefined" ? window.location.href : undefined,
        language: event.locale,
      });
      return;
    case "view_item":
      dl.push({ ecommerce: null });
      dl.push({
        event: "view_item",
        ecommerce: {
          currency: event.item.currency,
          value: event.item.price,
          items: [toGtmItem(event.item)],
        },
      });
      return;
    case "select_item":
      dl.push({ ecommerce: null });
      dl.push({
        event: "select_item",
        ecommerce: {
          item_list_name: event.list_name,
          items: [toGtmItem(event.item)],
        },
      });
      return;
    case "view_item_list":
      dl.push({ ecommerce: null });
      dl.push({
        event: "view_item_list",
        ecommerce: {
          item_list_name: event.list_name,
          items: event.items.map((i) => toGtmItem(i)),
        },
      });
      return;
    case "search":
      dl.push({ event: "search", search_term: event.query });
      return;
    case "lead":
      dl.push({ event: "generate_lead", source: event.source });
      return;
    case "contact":
      dl.push({ event: "contact", method: event.channel });
      return;
    case "newsletter":
      dl.push({ event: "sign_up", method: "newsletter" });
      return;
    case "add_to_cart":
      dl.push({ ecommerce: null });
      dl.push({
        event: "add_to_cart",
        ecommerce: {
          currency: event.currency,
          value: event.value,
          items: event.items.map((i) => toGtmItem(i)),
        },
      });
      return;
    case "begin_checkout":
      dl.push({ ecommerce: null });
      dl.push({
        event: "begin_checkout",
        ecommerce: {
          currency: event.currency,
          value: event.value,
          items: event.items.map((i) => toGtmItem(i)),
        },
      });
      return;
    case "purchase":
      dl.push({ ecommerce: null });
      dl.push({
        event: "purchase",
        ecommerce: {
          transaction_id: event.transaction_id,
          currency: event.currency,
          value: event.value,
          tax: event.tax,
          shipping: event.shipping,
          items: event.items.map((i) => toGtmItem(i)),
        },
      });
      return;
  }
}
