"use client";

// Locale-scoped error boundary. Catches uncaught exceptions thrown
// inside any segment under /[locale]/... and renders a friendly,
// localized fallback. Errors thrown by the layout itself escape this
// boundary and land in app/global-error.tsx instead.
//
// Privacy/security notes:
//   • We never render error.message verbatim. In production Next
//     replaces server-thrown messages with a generic identifier
//     anyway, but we belt-and-brace by only surfacing the digest.
//   • The boundary forwards (error, ctx) into lib/observability.ts.
//     That shim is a Phase-4 swap target for @sentry/nextjs and
//     no-ops by default; the site still works without telemetry.
//
// Next 16.2 prop note: the recommended prop is `unstable_retry`,
// which re-fetches the segment's data and re-renders. The older
// `reset` prop still exists for the rare case where you only want
// to clear the error state. We bind to `unstable_retry` because
// users hitting "Try again" expect a fresh fetch, not a re-render
// of the same stale data that just crashed.

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { logError } from "@/lib/observability";

type ErrorProps = {
  error: Error & { digest?: string };
  // Next 16.2+ surfaces unstable_retry; older deployments may still
  // pass `reset`. Both are optional in our typing so the file works
  // across an in-progress upgrade.
  unstable_retry?: () => void;
  reset?: () => void;
};

export default function LocaleError({
  error,
  unstable_retry,
  reset,
}: ErrorProps) {
  const t = useTranslations("error_boundary");
  const tBreadcrumbs = useTranslations("breadcrumbs");

  useEffect(() => {
    logError(error, {
      route:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      digest: error.digest,
      scope: "route",
    });
  }, [error]);

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: tBreadcrumbs("error") },
  ];

  // Prefer unstable_retry (refetches + re-renders); fall back to the
  // legacy reset() prop on platforms that haven't shipped 16.2+.
  const handleRetry = () => {
    if (typeof unstable_retry === "function") unstable_retry();
    else if (typeof reset === "function") reset();
  };

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <section
        // role + aria-live so screen readers announce the boundary
        // when it's swapped in mid-navigation.
        role="alert"
        aria-live="polite"
        aria-labelledby="error-heading"
        className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16"
      >
        <h1
          id="error-heading"
          className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          {t("title")}
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("body")}
        </p>

        {/* base-nova <Button> doesn't accept asChild, and <a> inside
            <button> is invalid HTML. We use <Button> for the retry
            action (real button semantics) and a styled <Link> for
            navigation, mirroring the hero. */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={handleRetry} type="button" size="lg" className="min-h-11 px-5">
            <RefreshCw aria-hidden="true" />
            {t("retry_button")}
          </Button>
          <Link
            href="/"
            className={
              buttonVariants({ size: "lg", variant: "outline" }) +
              " min-h-11 px-5"
            }
          >
            <ChevronLeft aria-hidden="true" />
            {t("home_button")}
          </Link>
        </div>

        {/* Reference id only — no error.message, no stack. The digest
            is the value Sentry will key on once Phase 4 ships, so it's
            also what a customer-support reply would quote back. */}
        {error.digest ? (
          <p className="mt-10 text-xs text-muted-foreground/80">
            {t("reference_prefix")}: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </section>
    </>
  );
}
