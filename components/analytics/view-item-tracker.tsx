"use client";

// Fires a single `view_item` analytics event when the product detail
// page mounts. The product payload is passed in from the server
// component so we don't fetch anything client-side.
//
// In React strict-mode dev builds, effects run twice on mount; the
// `firedRef` guards against the double-fire so consented prod and
// dev report identical event counts.

import { useEffect, useRef } from "react";
import { track, type Item } from "@/lib/analytics";

export function ViewItemTracker({ item }: { item: Item }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    track({ type: "view_item", item });
  }, [item]);

  return null;
}
