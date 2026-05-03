"use client";

// Compact two-action consent banner. Customize is intentionally not
// here — granular per-category preferences are reachable from the
// footer's "Manage cookies" link, which opens the same settings sheet.
// Renders only when the visitor has not yet decided (choice === null).
// Escape acts as a soft decline; it never silently grants consent.

import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";

export function Banner() {
  const t = useTranslations("consent.banner");
  const { choice, decide } = useConsent();

  if (choice !== null) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      decide("necessary-only");
    }
  };

  return (
    <div
      role="region"
      aria-labelledby="consent-banner-heading"
      aria-live="polite"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      // pb-safe pushes the banner above the iOS home-indicator strip
      // so the bottom button isn't half-hidden under the gesture bar.
      // px-safe + horizontal padding handles the landscape notch case.
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-safe pb-safe shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <h2 id="consent-banner-heading" className="sr-only">
        {t("heading")}
      </h2>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6 md:py-4">
        <div className="flex flex-1 items-start gap-3 md:items-center">
          <Cookie
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground md:mt-0"
          />
          {/* `min-w-0` lets the paragraph shrink so the cookie icon and
              the action buttons aren't pushed off-screen. */}
          <p className="line-clamp-2 min-w-0 text-sm leading-snug text-muted-foreground">
            {t("body")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
            >
              {t("links.privacy_policy")}
            </Link>
          </p>
        </div>
        {/* min-h-11 enforces the 44px hit-area on the action row even
            when the Button's `size="sm"` would otherwise shrink it.
            Stacked column on mobile, side-by-side at md+. */}
        <div className="flex flex-col gap-2 md:flex-row md:flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("accept-all")}
            className="min-h-11 w-full justify-center md:w-auto"
          >
            {t("buttons.accept_all")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("necessary-only")}
            className="min-h-11 w-full justify-center md:w-auto"
          >
            {t("buttons.necessary_only")}
          </Button>
        </div>
      </div>
    </div>
  );
}
