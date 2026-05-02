// Plausible provider — runs independently of GTM mode. Plausible is
// privacy-first and cookieless, but we still gate on consent so the
// site exposes one consistent privacy posture. The plausible.js script
// emits page_view automatically; we re-fire on client-side route
// changes and emit named goals for ecommerce / engagement events.

import type { AnalyticsEvent } from "../types";

type PlausibleFn = (
  eventName: string,
  options?: { props?: Record<string, unknown>; revenue?: { currency: string; amount: number } }
) => void;

function getPlausible(): PlausibleFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { plausible?: PlausibleFn };
  return typeof w.plausible === "function" ? w.plausible : null;
}

export function plausibleTrack(event: AnalyticsEvent): void {
  const plausible = getPlausible();
  if (!plausible) return;

  switch (event.type) {
    case "page_view":
      // The Plausible script auto-tracks document.location on load.
      // For client-side navigations we trigger a manual pageview.
      plausible("pageview");
      return;
    case "view_item":
      plausible("ViewItem", {
        props: {
          item_id: event.item.item_id,
          item_name: event.item.item_name,
          item_category: event.item.item_category,
          price: event.item.price,
        },
      });
      return;
    case "select_item":
      plausible("SelectItem", {
        props: {
          item_id: event.item.item_id,
          list_name: event.list_name ?? "",
        },
      });
      return;
    case "view_item_list":
      plausible("ViewItemList", {
        props: {
          list_name: event.list_name,
          item_count: event.items.length,
        },
      });
      return;
    case "search":
      plausible("Search", { props: { query: event.query } });
      return;
    case "lead":
      plausible("Lead", { props: { source: event.source ?? "" } });
      return;
    case "contact":
      plausible("Contact", { props: { channel: event.channel ?? "" } });
      return;
    case "newsletter":
      plausible("Newsletter");
      return;
    case "add_to_cart":
      plausible("AddToCart", {
        revenue: { currency: event.currency, amount: event.value },
      });
      return;
    case "begin_checkout":
      plausible("BeginCheckout", {
        revenue: { currency: event.currency, amount: event.value },
      });
      return;
    case "purchase":
      plausible("Purchase", {
        props: { transaction_id: event.transaction_id },
        revenue: { currency: event.currency, amount: event.value },
      });
      return;
  }
}
