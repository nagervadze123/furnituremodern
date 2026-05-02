// Meta Pixel provider — direct mode. Skipped when GTM is configured
// (Meta tags belong inside the GTM container in that mode). Talks to
// the fbq() global loaded by components/analytics-loader.tsx.

import type { AnalyticsEvent, Item } from "../types";

type FbqFn = (
  command: "track" | "trackCustom" | "init" | "consent",
  ...args: unknown[]
) => void;

function getFbq(): FbqFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { fbq?: FbqFn };
  return typeof w.fbq === "function" ? w.fbq : null;
}

function toMetaContent(item: Item): Record<string, unknown> {
  return {
    id: item.item_id,
    quantity: item.quantity ?? 1,
    item_price: item.price,
  };
}

export function metaTrack(event: AnalyticsEvent): void {
  const fbq = getFbq();
  if (!fbq) return;

  switch (event.type) {
    case "page_view":
      fbq("track", "PageView");
      return;
    case "view_item":
      fbq("track", "ViewContent", {
        content_ids: [event.item.item_id],
        content_name: event.item.item_name,
        content_category: event.item.item_category,
        content_type: "product",
        value: event.item.price,
        currency: event.item.currency,
        contents: [toMetaContent(event.item)],
      });
      return;
    case "select_item":
      // Meta has no native "select item" — emit a custom event so it
      // shows up in the Events Manager without polluting standard
      // catalog metrics.
      fbq("trackCustom", "SelectItem", {
        content_ids: [event.item.item_id],
        item_list_name: event.list_name,
      });
      return;
    case "view_item_list":
      fbq("trackCustom", "ViewItemList", {
        content_ids: event.items.map((i) => i.item_id),
        item_list_name: event.list_name,
        num_items: event.items.length,
      });
      return;
    case "search":
      fbq("track", "Search", { search_string: event.query });
      return;
    case "lead":
      fbq("track", "Lead", { source: event.source });
      return;
    case "contact":
      fbq("track", "Contact", { method: event.channel });
      return;
    case "newsletter":
      fbq("track", "Subscribe");
      return;
    case "add_to_cart":
      fbq("track", "AddToCart", {
        content_ids: event.items.map((i) => i.item_id),
        content_type: "product",
        value: event.value,
        currency: event.currency,
        contents: event.items.map(toMetaContent),
      });
      return;
    case "begin_checkout":
      fbq("track", "InitiateCheckout", {
        content_ids: event.items.map((i) => i.item_id),
        content_type: "product",
        value: event.value,
        currency: event.currency,
        num_items: event.items.length,
        contents: event.items.map(toMetaContent),
      });
      return;
    case "purchase":
      fbq("track", "Purchase", {
        content_ids: event.items.map((i) => i.item_id),
        content_type: "product",
        value: event.value,
        currency: event.currency,
        num_items: event.items.length,
        contents: event.items.map(toMetaContent),
      });
      return;
  }
}
