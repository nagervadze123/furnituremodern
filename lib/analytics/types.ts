// Typed event union for the analytics layer.
//
// The shape closely mirrors GA4 Recommended Events so the GA4 / GTM
// providers can pass items straight through; Meta and Plausible have
// their own mappers that re-shape these payloads at dispatch time.
//
// Ecommerce events (AddToCart / BeginCheckout / Purchase) are defined
// for type safety; no UI fires them yet.

export type Currency = "GEL" | "USD" | "EUR";

// One product/SKU as it appears in an event payload. `item_brand` is
// always our brand because the catalogue is single-vendor; if the site
// ever resells third-party brands, switch to per-product brand.
export type Item = {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  currency: Currency;
  item_brand: string;
  quantity?: number;
};

export type PageViewEvent = {
  type: "page_view";
  pathname: string;
  search?: string;
  locale?: string;
};

export type ViewItemEvent = {
  type: "view_item";
  item: Item;
};

export type SelectItemEvent = {
  type: "select_item";
  item: Item;
  list_name?: string;
};

export type ViewItemListEvent = {
  type: "view_item_list";
  list_name: string;
  items: Item[];
};

export type SearchEvent = {
  type: "search";
  query: string;
};

export type LeadEvent = {
  type: "lead";
  source?: string;
};

export type ContactEvent = {
  type: "contact";
  channel?: "email" | "phone" | "form";
};

export type NewsletterEvent = {
  type: "newsletter";
  email_hash?: string;
};

export type AddToCartEvent = {
  type: "add_to_cart";
  items: Item[];
  value: number;
  currency: Currency;
};

export type BeginCheckoutEvent = {
  type: "begin_checkout";
  items: Item[];
  value: number;
  currency: Currency;
};

export type PurchaseEvent = {
  type: "purchase";
  transaction_id: string;
  items: Item[];
  value: number;
  currency: Currency;
  tax?: number;
  shipping?: number;
};

export type AnalyticsEvent =
  | PageViewEvent
  | ViewItemEvent
  | SelectItemEvent
  | ViewItemListEvent
  | SearchEvent
  | LeadEvent
  | ContactEvent
  | NewsletterEvent
  | AddToCartEvent
  | BeginCheckoutEvent
  | PurchaseEvent;

export type AnalyticsEventType = AnalyticsEvent["type"];
