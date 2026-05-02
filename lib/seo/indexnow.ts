// IndexNow submitter — best-effort, never throws.
//
// IndexNow (https://www.indexnow.org) is a multi-engine ping protocol
// supported by Bing, Yandex, Naver, Seznam, etc. We submit URLs that
// just changed and the engines re-crawl them on a faster path than a
// regular sitemap-driven cycle.
//
// Configuration:
//   • INDEXNOW_KEY  — opaque public token (32-128 hex chars, generated
//     once per host, server-side env so it isn't bundled into the
//     client). Public by design — search engines fetch a key file
//     to verify ownership.
//   • INDEXNOW_HOST — bare host, e.g. "furnituremodern.ge". Optional;
//     falls back to the host parsed from NEXT_PUBLIC_SITE_URL.
//
// Behavior:
//   • No-op when either env var (or its fallback) is missing.
//   • De-duplicates and validates URLs (must match the host).
//   • 5-second timeout — a slow IndexNow request must not freeze an
//     admin save.
//   • All errors are logged at warning level. Never propagates to the
//     caller.

import { SITE_HOST, absoluteUrl } from "@/lib/site-config";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_FILE_PATH = "/indexnow.txt";
const REQUEST_TIMEOUT_MS = 5000;

export type IndexNowConfig = {
  key: string;
  host: string;
  keyLocation: string;
};

export type IndexNowSubmitter = (urls: string[]) => Promise<void>;

// Pure config reader. Returns null when either piece is missing —
// callers treat null as "indexnow disabled".
export function readIndexNowConfig(env: NodeJS.ProcessEnv = process.env): IndexNowConfig | null {
  const key = (env.INDEXNOW_KEY ?? "").trim();
  if (!key) return null;
  const host = (env.INDEXNOW_HOST ?? SITE_HOST).trim();
  if (!host) return null;
  return {
    key,
    host,
    keyLocation: absoluteUrl(KEY_FILE_PATH),
  };
}

// De-dupe + filter to the configured host. URLs that point at a
// different host are dropped — IndexNow's API rejects mixed-host
// payloads with a 422.
export function normalizeUrls(urls: string[], host: string): string[] {
  const seen = new Set<string>();
  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    if (parsed.host !== host) continue;
    seen.add(parsed.toString());
  }
  return Array.from(seen);
}

export type SubmitDeps = {
  fetch?: typeof fetch;
  log?: (msg: string, ...rest: unknown[]) => void;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

// The actual POST. Public to allow injecting fetch in tests; product
// code uses the default-export `submitIndexNow` below.
export async function submitIndexNowWith(
  urls: string[],
  deps: SubmitDeps = {}
): Promise<void> {
  const config = readIndexNowConfig(deps.env);
  if (!config) return;

  const list = normalizeUrls(urls, config.host);
  if (list.length === 0) return;

  const fetchImpl = deps.fetch ?? fetch;
  const log = deps.log ?? console.warn;
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: config.host,
        key: config.key,
        keyLocation: config.keyLocation,
        urlList: list,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      log("[indexnow] non-2xx response", res.status, res.statusText);
    }
  } catch (err) {
    log("[indexnow] submission failed", err);
  } finally {
    clearTimeout(timer);
  }
}

// Default export with no injection — what admin actions call.
export async function submitIndexNow(urls: string[]): Promise<void> {
  return submitIndexNowWith(urls);
}

// Build a list of canonical URLs for a product across both locales.
// Used by admin actions to assemble the urlList payload.
const LOCALES = ["ka", "en"] as const;
export function productUrls(category: string, slug: string): string[] {
  return LOCALES.map((l) => absoluteUrl(`/${l}/${category}/${slug}`));
}
