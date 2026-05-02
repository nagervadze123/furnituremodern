// Beacon endpoint hit by the locale not-found page when a path 404s.
// We hash the IP before storage so the table can't be used for tracking
// individual visitors but can still answer "is this the same source?".
//
// Rate limit: 30 calls / minute / IP, in-memory (best-effort on
//   serverless cold starts; goal is anti-runaway, not anti-attacker).

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter, log404Schema } from "@/lib/api/log-404";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // FNV-1a 32-bit; cheap and good enough for grouping anonymous reports.
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

const withinRateLimit = createRateLimiter({ max: 30, windowMs: 60_000 });

export async function POST(request: Request) {
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const bucketKey = rawIp ?? "unknown";

  if (!withinRateLimit(bucketKey)) {
    return NextResponse.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 }
    );
  }
  const parsed = log404Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid payload" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("not_found_log").insert({
    path: parsed.data.path,
    locale: parsed.data.locale ?? null,
    referrer: parsed.data.referrer ?? null,
    ip_hash: hashIp(rawIp),
  });

  return NextResponse.json({ ok: true });
}
