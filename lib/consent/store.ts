"use client";

// Granular cookie consent store. Pure parsers are SSR-safe; side-
// effecting helpers (`writeConsent`, `useConsent`) only touch the
// browser globals at call time, never at module import.

import { useSyncExternalStore } from "react";
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  type ConsentChoice,
  type ConsentDecision,
} from "./types";

const CONSENT_EVENT = "fm-consent-change";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildLegacyChoice(
  granted: boolean,
  now: () => Date = () => new Date()
): ConsentChoice {
  return {
    analytics: granted,
    marketing: granted,
    updatedAt: now().toISOString(),
  };
}

export function parseStoredConsent(
  raw: string | null | undefined
): ConsentChoice | null {
  if (raw === null || raw === undefined || raw === "") return null;

  // Legacy migration path — the binary banner used these literal
  // strings (in localStorage); if a future cookie-only reader sees
  // them in the cookie they should still be honored.
  if (raw === "accepted") return buildLegacyChoice(true);
  if (raw === "declined") return buildLegacyChoice(false);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  const keys = Object.keys(parsed);
  if (keys.length !== 3) return null;
  if (
    !Object.prototype.hasOwnProperty.call(parsed, "analytics") ||
    !Object.prototype.hasOwnProperty.call(parsed, "marketing") ||
    !Object.prototype.hasOwnProperty.call(parsed, "updatedAt")
  ) {
    return null;
  }

  const { analytics, marketing, updatedAt } = parsed;
  if (typeof analytics !== "boolean") return null;
  if (typeof marketing !== "boolean") return null;
  if (typeof updatedAt !== "string" || updatedAt.length === 0) return null;

  return { analytics, marketing, updatedAt };
}

export function serializeConsent(choice: ConsentChoice): string {
  // Stable key order: analytics, marketing, updatedAt.
  return JSON.stringify({
    analytics: choice.analytics,
    marketing: choice.marketing,
    updatedAt: choice.updatedAt,
  });
}

type WriteConsentInput = Pick<ConsentChoice, "analytics" | "marketing">;

type WriteConsentDeps = {
  now?: () => Date;
  writeCookie?: (raw: string) => void;
  emitChange?: (choice: ConsentChoice) => void;
};

export function writeConsent(
  input: WriteConsentInput,
  deps?: WriteConsentDeps
): ConsentChoice {
  const now = deps?.now ?? (() => new Date());
  const writeCookie =
    deps?.writeCookie ??
    ((raw: string) => {
      if (typeof document !== "undefined") {
        document.cookie = raw;
      }
    });
  const emitChange =
    deps?.emitChange ??
    ((choice: ConsentChoice) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice })
        );
      }
    });

  const full: ConsentChoice = {
    analytics: input.analytics,
    marketing: input.marketing,
    updatedAt: now().toISOString(),
  };

  const encoded = encodeURIComponent(serializeConsent(full));
  const attrs = [
    `${CONSENT_COOKIE_NAME}=${encoded}`,
    `Max-Age=${CONSENT_COOKIE_MAX_AGE}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    window.location.protocol === "https:"
  ) {
    attrs.push("Secure");
  }

  writeCookie(attrs.join("; "));
  emitChange(full);

  return full;
}

// Snapshot cache for `useSyncExternalStore`. React diffs the snapshot
// reference with `Object.is` between renders; if `readConsentFromBrowser`
// returned a fresh `{ analytics, marketing, updatedAt }` object each
// call (which `parseStoredConsent` does), React sees a different
// reference every render, re-renders, calls getSnapshot again, gets
// another new object, and loops until the renderer crashes. We cache
// the parsed result keyed on the raw URL-encoded cookie value so the
// reference is stable until the cookie actually changes.
let cachedRaw: string | null = null;
let cachedSnapshot: ConsentChoice | null = null;

export function readConsentFromBrowser(): ConsentChoice | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie;
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  let raw: string | null = null;
  if (cookie) {
    const parts = cookie.split("; ");
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        raw = part.slice(prefix.length);
        break;
      }
    }
  }

  if (raw === cachedRaw) return cachedSnapshot;

  cachedRaw = raw;
  if (raw === null) {
    cachedSnapshot = null;
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    cachedSnapshot = null;
    return null;
  }
  cachedSnapshot = parseStoredConsent(decoded);
  return cachedSnapshot;
}

export function getConsentServerSide(
  cookieValue: string | undefined
): ConsentChoice | null {
  return parseStoredConsent(cookieValue);
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // Same-tab updates fire CONSENT_EVENT; "storage" is a defensive
  // belt-and-braces for cross-tab futures (we use a cookie today).
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useConsent(): {
  choice: ConsentChoice | null;
  setChoice: (c: WriteConsentInput) => void;
  decide: (d: ConsentDecision) => void;
} {
  const choice = useSyncExternalStore(
    subscribe,
    readConsentFromBrowser,
    () => null
  );

  const setChoice = (c: WriteConsentInput): void => {
    writeConsent(c);
  };

  const decide = (d: ConsentDecision): void => {
    if (d === "accept-all") {
      setChoice({ analytics: true, marketing: true });
    } else if (d === "necessary-only") {
      setChoice({ analytics: false, marketing: false });
    }
    // "custom" and "not-decided" are intentional no-ops.
  };

  return { choice, setChoice, decide };
}
