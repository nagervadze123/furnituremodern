// Beacon endpoint hit by the locale not-found page when a path 404s.
// We hash the IP before storage so the table can't be used for tracking
// individual visitors but can still answer "is this the same source?".

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { path?: string; locale?: string; referrer?: string }
    | null;
  if (!body?.path) return NextResponse.json({ ok: false }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const supabase = createSupabaseAdminClient();
  await supabase.from("not_found_log").insert({
    path: body.path.slice(0, 2048),
    locale: body.locale ?? null,
    referrer: body.referrer?.slice(0, 2048) ?? null,
    ip_hash: hashIp(ip),
  });

  return NextResponse.json({ ok: true });
}
