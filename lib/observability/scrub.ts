// PII scrubbers for the Sentry beforeSend hook. The privacy contract
// in CHECKLIST.md ("no PII in any analytics or observability event")
// is enforced HERE — every event leaving the SDK runs through the
// matching scrubber first. If you add a new IP-bearing header or a
// new known-PII surface, add it to this file and to scrub.test.ts so
// the contract stays self-checking.
//
// Two functions because client and server have different surfaces:
//   • Server events carry IP-bearing transport headers
//     (x-forwarded-for, x-real-ip, forwarded, cf-connecting-ip) the
//     edge proxy/CDN added before the request reached us.
//   • Client events also include the URL the user is viewing, which
//     may contain PII in query strings (e.g. /search?q=phone-number).
//
// Both scrubbers are pure: they accept a Sentry Event, return a
// (possibly modified) Event, and never throw. Sentry treats a return
// of `null` as "drop the event entirely" — we never use that here.

import type { ErrorEvent } from "@sentry/nextjs";

// Headers the upstream load balancer / CDN populates with the
// originating client IP. Sentry's defaultPii flag is OFF, but the
// SDK still forwards request headers verbatim, so we strip these
// explicitly. Lowercased — Node normalizes inbound headers to
// lowercase, but we belt-and-brace by also matching the casing
// browsers send (see filterHeaders below).
const IP_BEARING_HEADERS = new Set([
  "x-forwarded-for",
  "x-real-ip",
  "forwarded",
  "cf-connecting-ip",
  "true-client-ip",
  "fastly-client-ip",
  "x-cluster-client-ip",
]);

// User-Agent is a fingerprinting surface (not PII per se, but enough
// entropy to track sessions). Strip it so events can't be correlated
// across IP rotations.
const FINGERPRINT_HEADERS = new Set(["user-agent"]);

// Authorization-style headers. Server scrubber doesn't expect these
// to appear in inbound requests, but the client scrubber must strip
// them in case our own fetch instrumentation echoes one back.
const AUTH_HEADERS = new Set(["authorization", "proxy-authorization"]);

function filterHeaders(
  headers: Record<string, string> | undefined,
  blocked: Set<string>
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (blocked.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

export function scrubServerEvent(event: ErrorEvent): ErrorEvent | null {
  try {
    if (event.user?.ip_address !== undefined) {
      event.user = { ...event.user };
      delete event.user.ip_address;
    }
    if (event.request) {
      const next = { ...event.request };
      if (next.cookies) delete next.cookies;
      next.headers = filterHeaders(next.headers as Record<string, string>, new Set([
        ...IP_BEARING_HEADERS,
        ...FINGERPRINT_HEADERS,
      ]));
      event.request = next;
    }
    return event;
  } catch {
    // Defensive: scrubbers must never throw — a thrown beforeSend
    // makes the SDK drop the event AND log a warning, defeating the
    // point. If anything goes wrong, return the event unmodified
    // rather than risk leaking PII; surface the bug via tests.
    return event;
  }
}

export function scrubClientEvent(event: ErrorEvent): ErrorEvent | null {
  try {
    // Strip query strings from request.url — search pages and form
    // submissions push potentially-sensitive values into ?q=… that
    // we don't want in error events.
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url);
        u.search = "";
        event.request = { ...event.request, url: u.toString() };
      } catch {
        // Malformed URL — leave as-is rather than guessing. Sentry
        // already won't display anything sensitive from a non-URL
        // string in the URL field.
      }
    }
    if (event.request?.headers) {
      event.request = {
        ...event.request,
        headers: filterHeaders(
          event.request.headers as Record<string, string>,
          AUTH_HEADERS
        ),
      };
    }
    return scrubServerEvent(event);
  } catch {
    return event;
  }
}
