"use client";

// Minimal first-party cookie consent banner.
//
// We don't pull in a third-party CMP because we only have one optional
// cookie category (analytics) and a custom dialog gives us a smaller
// JS payload + full a11y control.
//
// Storage: a single localStorage key. Three possible values:
//   "accepted" | "declined" | (absent → undecided, show banner)
//
// On accept/decline we dispatch a window event so other components
// (notably <Analytics />) can react without a page reload.

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fm-consent";
const EVENT_NAME = "fm-consent-change";

export type ConsentState = "accepted" | "declined";

export function getStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

function subscribe(callback: () => void): () => void {
  // Same-tab change (we dispatch this ourselves) + cross-tab change
  // (browser fires `storage` on other tabs when localStorage changes).
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useConsent(): ConsentState | null {
  return useSyncExternalStore(
    subscribe,
    getStoredConsent,
    () => null // server snapshot — banner is hidden during SSR.
  );
}

function persistConsent(state: ConsentState) {
  window.localStorage.setItem(STORAGE_KEY, state);
  window.dispatchEvent(
    new CustomEvent<ConsentState>(EVENT_NAME, { detail: state })
  );
}

export function CookieConsent() {
  const t = useTranslations("consent");
  const consent = useConsent();

  // Hidden during SSR (consent === null on the server) and after the
  // user has chosen. The hydration mismatch is intentional: the server
  // never renders the banner; the client may render it after hydration
  // if the user is undecided.
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border bg-background p-4 shadow-lg sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1 text-sm">
          <p className="font-semibold">{t("title")}</p>
          <p className="mt-1 text-muted-foreground">{t("body")}</p>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => persistConsent("declined")}
          >
            {t("decline")}
          </Button>
          <Button size="sm" onClick={() => persistConsent("accepted")}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
