"use client";

// Granular cookie consent banner — three actions in GDPR-compliant
// order: Accept all, Necessary only, Customize. Renders only when the
// visitor has not yet decided (choice === null). Reads/writes via
// `lib/consent/useConsent`. The "Customize" action opens a settings
// sheet that owns per-category toggles.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { SettingsSheet } from "./settings-sheet";

export function Banner() {
  const t = useTranslations("consent.banner");
  const { choice, decide } = useConsent();
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Hidden during SSR (server snapshot is null) and after the user has
  // chosen. Hydration mismatch is intentional — server never renders
  // the banner; client may render it after hydration if undecided.
  if (choice !== null) return null;

  // Soft decline on Escape — never silently grant consent.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      decide("necessary-only");
    }
  };

  return (
    <>
      <div
        role="region"
        aria-live="polite"
        aria-labelledby="consent-banner-heading"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border bg-background p-4 shadow-lg sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1 text-sm">
            <p
              id="consent-banner-heading"
              className="font-semibold"
            >
              {t("heading")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t("body")}{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:no-underline"
              >
                {t("links.privacy_policy")}
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-shrink-0 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => decide("accept-all")}
              >
                {t("buttons.accept_all")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => decide("necessary-only")}
              >
                {t("buttons.necessary_only")}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="text-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("buttons.customize")}
            </button>
          </div>
        </div>
      </div>
      <SettingsSheet open={isCustomizing} onOpenChange={setIsCustomizing} />
    </>
  );
}
