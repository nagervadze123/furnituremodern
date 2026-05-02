// Cross-deployment revalidation helper.
//
// Every admin write action calls notifyRevalidation() instead of
// revalidatePath() directly. This does two things:
//
//   1. Calls revalidatePath/revalidateTag on the local runtime so the
//      page that just rendered the admin form sees fresh data.
//   2. Fires a fire-and-forget POST to REVALIDATE_WEBHOOK_URL so a
//      peer deployment (typically Vercel from a localhost edit, or
//      vice versa) invalidates its cache too.
//
// The webhook call is best-effort: failures are logged, never thrown.
// If REVALIDATE_WEBHOOK_URL or REVALIDATE_SECRET is unset, the
// cross-instance call is skipped silently — local-only deployments
// (a fresh clone, CI, etc.) just work without configuration.

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export type PathSpec = {
  path: string;
  type?: "page" | "layout";
};

export type RevalidationPayload = {
  paths?: PathSpec[];
  tags?: string[];
};

export async function notifyRevalidation(
  payload: RevalidationPayload
): Promise<void> {
  const paths = payload.paths ?? [];
  const tags = payload.tags ?? [];

  // 1. Local revalidation — synchronous, never fails.
  for (const spec of paths) {
    revalidatePath(spec.path, spec.type);
  }
  for (const tag of tags) {
    // expire:0 — admin writes want immediate invalidation, not the
    // stale-while-revalidate semantics of profile:"max".
    revalidateTag(tag, { expire: 0 });
  }

  // 2. Cross-instance webhook — fire and forget.
  const url = process.env.REVALIDATE_WEBHOOK_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;

  // Don't await: the user's save shouldn't block on a peer that may
  // be cold-starting or temporarily down. Errors land in server logs
  // and the cache will catch up via the normal revalidate fallback.
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ paths, tags }),
    // Short timeout so a hung peer doesn't pile up open sockets.
    signal: AbortSignal.timeout(5_000),
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(
          "[revalidation] webhook returned %d for %s",
          res.status,
          url
        );
      }
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[revalidation] webhook POST failed: %s", msg);
    });
}
