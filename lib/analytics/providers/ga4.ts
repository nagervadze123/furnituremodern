// GA4 provider — direct mode. Skipped when GTM is configured (the
// GTM container owns GA4 in that mode). Talks to the gtag.js global
// loaded by components/analytics-loader.tsx.

import type { AnalyticsEvent, Item } from "../types";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { gtag?: GtagFn };
  return typeof w.gtag === "function" ? w.gtag : null;
}

// GA4 expects items as an array of plain objects with the same field
// names we use internally. Quantity defaults to 1 for view/select.
function toGa4Item(item: Item, defaultQty = 1): Record<string, unknown> {
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

export function ga4Track(event: AnalyticsEvent): void {
  const gtag = getGtag();
  if (!gtag) return;

  switch (event.type) {
    case "page_view":
      // GA4 records page_view automatically when send_page_view is on,
      // but we fire explicitly to capture client-side route changes
      // that happen without a fresh document load.
      gtag("event", "page_view", {
        page_path: event.pathname + (event.search ?? ""),
        page_location:
          typeof window !== "undefined" ? window.location.href : undefined,
        language: event.locale,
      });
      return;
    case "view_item":
      gtag("event", "view_item", {
        currency: event.item.currency,
        value: event.item.price,
        items: [toGa4Item(event.item)],
      });
      return;
    case "select_item":
      gtag("event", "select_item", {
        item_list_name: event.list_name,
        items: [toGa4Item(event.item)],
      });
      return;
    case "view_item_list":
      gtag("event", "view_item_list", {
        item_list_name: event.list_name,
        items: event.items.map((i) => toGa4Item(i)),
      });
      return;
    case "search":
      gtag("event", "search", { search_term: event.query });
      return;
    case "lead":
      gtag("event", "generate_lead", { source: event.source });
      return;
    case "contact":
      gtag("event", "contact", { method: event.channel });
      return;
    case "newsletter":
      gtag("event", "sign_up", { method: "newsletter" });
      return;
    case "add_to_cart":
      gtag("event", "add_to_cart", {
        currency: event.currency,
        value: event.value,
        items: event.items.map((i) => toGa4Item(i)),
      });
      return;
    case "begin_checkout":
      gtag("event", "begin_checkout", {
        currency: event.currency,
        value: event.value,
        items: event.items.map((i) => toGa4Item(i)),
      });
      return;
    case "purchase":
      gtag("event", "purchase", {
        transaction_id: event.transaction_id,
        currency: event.currency,
        value: event.value,
        tax: event.tax,
        shipping: event.shipping,
        items: event.items.map((i) => toGa4Item(i)),
      });
      return;
  }
}
