// Confirm + delete button for the product edit page. Wraps a server
// action that performs a soft delete; the admin picks between
// "redirect to category" (301) and "mark as gone" (410) before
// confirming.

"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ActionState,
  DeleteMode,
} from "@/app/(admin)/admin/(dashboard)/products/actions";

type Props = {
  // Pre-bound action that takes the mode at call time.
  action: (mode: DeleteMode) => Promise<ActionState>;
};

export function DeleteProductButton({ action }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<DeleteMode>("redirect");

  const handleClick = () => {
    const confirmText =
      mode === "gone"
        ? "Mark this product as permanently gone (410)? Old URLs will return Gone instead of redirecting."
        : "Soft-delete this product? Old URLs will 301-redirect to the category page.";
    if (!confirm(confirmText)) return;

    startTransition(async () => {
      // The action redirects on success.
      await action(mode);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Delete mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as DeleteMode)}
        disabled={pending}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="redirect">Redirect to category</option>
        <option value="gone">Mark as gone (410)</option>
      </select>
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
    </div>
  );
}
