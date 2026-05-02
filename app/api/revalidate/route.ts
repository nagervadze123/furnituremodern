// POST /api/revalidate
//
// Cross-deployment cache-invalidation webhook. Called by peer
// deployments after admin writes — e.g. localhost admin editing a
// product fires this against the Vercel URL so production's cache
// drops the stale page. Lib/revalidation/notify.ts is the typical
// caller.
//
// Auth: Bearer token matching REVALIDATE_SECRET.
// Rate limit: 60 calls / minute / IP, in-memory (best-effort on
//   serverless cold starts; goal is anti-runaway, not anti-attacker).
// Body shape: { paths?: PathSpec[], tags?: string[] }
//   PathSpec = { path: string, type?: "page" | "layout" }

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const PathSpecSchema = z.object({
  path: z.string().min(1).max(2048),
  type: z.enum(["page", "layout"]).optional(),
});

const PayloadSchema = z.object({
  paths: z.array(PathSpecSchema).max(100).optional(),
  tags: z.array(z.string().min(1).max(256)).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Rate limiter — 60 requests / minute / IP.
// ---------------------------------------------------------------------------
// Module-level Map persists for the lifetime of the warm function
// instance. On a cold start this resets to empty, which is fine for
// the threat model: prevent a buggy caller from looping forever, not
// stop a distributed attacker. Vercel KV / Upstash would be the right
// upgrade if real abuse becomes a concern.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  // 1. Auth.
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET not configured" },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate limit.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!withinRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 }
    );
  }

  // 3. Body validation.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  // 4. Apply revalidation.
  const paths = parsed.data.paths ?? [];
  const tags = parsed.data.tags ?? [];
  for (const spec of paths) {
    revalidatePath(spec.path, spec.type);
  }
  for (const tag of tags) {
    // expire:0 — peer just wrote and wants the next request to see
    // fresh data, not stale-while-revalidate.
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({
    ok: true,
    revalidatedPaths: paths.length,
    revalidatedTags: tags.length,
  });
}
