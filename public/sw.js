// Furnituremodern minimal service worker.
//
// Goals:
//   1. Provide an offline fallback page for navigation requests.
//   2. Cache the small set of static branding assets so PWA install,
//      home-screen icons, and the offline page work without network.
//   3. Serve content-hashed Next.js static assets (/_next/static/*) with a
//      stale-while-revalidate strategy because they are immutable per build.
//
// Non-goals:
//   - No offline catalogue, no aggressive HTML caching.
//   - Never intercept /admin, /api, RSC payloads, or auth requests.
//   - No push notifications, no background sync.
//
// Bump CACHE_VERSION whenever the precache list or behaviour changes;
// the activate handler purges any cache whose name doesn't match.

const CACHE_VERSION = "fm-pwa-v2";

const PRECACHE_URLS = [
  "/offline.html",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Paths the SW must NEVER cache or intercept. Returning early without
// calling event.respondWith() lets the browser handle the request
// normally — no SW interference, no stale data.
function shouldBypass(url) {
  if (url.pathname.startsWith("/admin")) return true;
  if (url.pathname.startsWith("/api")) return true;
  if (url.pathname.startsWith("/_next/data")) return true;
  if (url.pathname.includes("/auth/")) return true;
  // RSC payloads carry a `_rsc` query param — never cache.
  if (url.searchParams.has("_rsc")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Same-origin only. Cross-origin requests (Supabase, analytics) flow
  // through to the network with normal browser caching semantics.
  if (url.origin !== self.location.origin) return;

  if (shouldBypass(url)) return;

  // Navigations: network-first, fall back to the offline page only when
  // the network errors. Do not cache successful HTML responses — that's
  // what causes the "stale product page" problem.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match("/offline.html");
        return (
          cached ||
          new Response(
            "<h1>Offline</h1><p>Please check your connection.</p>",
            { status: 503, headers: { "Content-Type": "text/html" } }
          )
        );
      })
    );
    return;
  }

  // Precached static branding assets — cache-first.
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Next.js content-hashed static assets — stale-while-revalidate.
  // These URLs change on every build, so caching them is safe.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else: pass through to the network. This intentionally
  // avoids caching dynamic HTML, product pages, search results, vitals,
  // and anything else that should always be fresh.
});
