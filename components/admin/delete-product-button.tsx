// Confirm + delete button for the product edit page. Wraps a server
// action that performs the actual delete; the button only handles the
// confirmation prompt and pending state.

"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/app/(admin)/admin/(dashboard)/products/actions";

type Props = {
  // Pre-bound delete action — the parent already calls .bind(null, id).
  action: () => Promise<ActionState>;
};

export function DeleteProductButton({ action }: Props) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !confirm(
        "Delete this product permanently? This also removes its images."
      )
    ) {
      return;
    }
    startTransition(async () => {
      // The action redirects on success, so we don't need to handle
      // the resolved value here.
      await action();
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="gap-1.5"
    >
      <Trash2 aria-hidden className="h-4 w-4" />
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
