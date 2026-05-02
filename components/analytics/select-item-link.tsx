"use client";

// Click-tracking wrapper that fires `select_item` then lets the
// underlying <Link> navigate normally. Used by ProductCard so the card
// stays a server component while the click handler is local to this
// thin client island.
//
// We do NOT preventDefault — navigation happens after the synchronous
// dispatch, which is enough for in-memory dataLayer.push / fbq calls
// before unload. For network beacons (GA4, Meta) the providers'
// own SDKs queue events into transport-with-keepalive so they survive
// the page transition.

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { track, type Item } from "@/lib/analytics";

type Props = {
  href: string;
  item: Item;
  list_name?: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function SelectItemLink({
  href,
  item,
  list_name,
  className,
  ariaLabel,
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => track({ type: "select_item", item, list_name })}
    >
      {children}
    </Link>
  );
}
