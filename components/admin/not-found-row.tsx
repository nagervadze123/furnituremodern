"use client";

// Single 404-log row on /admin/seo with an inline "Create redirect"
// form. Toggles open on click, takes a destination path, posts via
// the seo/actions server action. Stays optimistic-on-success: when
// the redirect lands the row collapses and a small "Saved" tag
// renders until the page revalidates.

import { useState, useTransition } from "react";
import { createRedirectFrom404Action } from "@/app/(admin)/admin/(dashboard)/seo/actions";

type Props = {
  path: string;
  count: number;
  lastSeen: string;
};

export function NotFoundRow({ path, count, lastSeen }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createRedirectFrom404Action(path, target.trim());
      if (!res.ok) {
        setError(res.message ?? "Failed.");
        return;
      }
      setDone(true);
      setOpen(false);
    });
  };

  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-2 font-mono text-xs">{path}</td>
      <td className="px-3 py-2">{count}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {new Date(lastSeen).toLocaleDateString()}
      </td>
      <td className="px-3 py-2 text-right">
        {done ? (
          <span className="text-xs text-emerald-600">Saved</span>
        ) : open ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="/ka/sofas/linen"
                className="h-7 w-56 rounded-md border border-input bg-background px-2 text-xs font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={submit}
                disabled={pending || !target.trim()}
                className="h-7 rounded-md bg-foreground px-2 text-xs text-background disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setTarget(path);
            }}
            className="text-xs text-foreground hover:underline"
          >
            Create redirect
          </button>
        )}
      </td>
    </tr>
  );
}
