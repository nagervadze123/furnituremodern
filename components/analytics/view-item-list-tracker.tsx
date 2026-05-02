"use client";

// Fires a single `view_item_list` event when a category page mounts.
// Items are passed down from the server component (no client fetching).

import { useEffect, useRef } from "react";
import { track, type Item } from "@/lib/analytics";

type Props = {
  list_name: string;
  items: Item[];
};

export function ViewItemListTracker({ list_name, items }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    track({ type: "view_item_list", list_name, items });
  }, [list_name, items]);

  return null;
}
