// Pure helpers for /api/log-404. Lifted into lib/ so they can be unit
// tested without spinning up a Next.js request — the route file itself
// stays a thin POST handler.

import { z } from "zod";

// The browser beacon (components/log-404-beacon.tsx) sends `path`
// always, with `locale` / `referrer` either string or null when absent.
// Cap each field so a malicious payload can't blow past column limits
// or push the row size out of cache.
export const log404Schema = z.object({
  path: z.string().min(1).max(2048),
  locale: z.string().max(64).nullable().optional(),
  referrer: z.string().max(2048).nullable().optional(),
});
export type Log404Payload = z.infer<typeof log404Schema>;

// Best-effort, in-memory IP rate limiter. Mirrors the shape used by
// /api/revalidate but factored as a factory so tests can inject a fake
// clock and create isolated buckets per test. On serverless cold
// starts the Map resets to empty; the goal is to throttle a single
// runaway client, not stop a distributed attacker.
export type RateLimiter = (ip: string) => boolean;

export function createRateLimiter({
  max,
  windowMs,
  now = Date.now,
}: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  return (ip: string) => {
    const t = now();
    const entry = buckets.get(ip);
    if (!entry || t - entry.windowStart > windowMs) {
      buckets.set(ip, { count: 1, windowStart: t });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count += 1;
    return true;
  };
}
