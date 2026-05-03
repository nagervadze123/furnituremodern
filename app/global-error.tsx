"use client";

// Catastrophic fallback. Renders only when an error escapes the locale
// layout — i.e., when the layout itself crashed and React's normal
// error.tsx boundary was never available.
//
// Why this file is English-only and self-contained:
//   • If we land here, the locale layout is dead. That same layout
//     loads next-intl, the design system, the fonts, and the CSP
//     nonce. Anything we import here that depends on that boot path
//     can re-throw and produce an infinite render loop.
//   • Inline styles only — no Tailwind, no CSS modules. The build
//     output for this file must be self-sufficient.
//   • Brand colors are hard-coded as hex literals matching
//     siteConfig.brand.background/foreground/accent. The
//     intentional duplication keeps this file from importing
//     site-config (whose import path may itself be what crashed).
//     If brand colors change, update them in BOTH places.
//   • English-only by design (CHECKLIST.md notes this). Loading the
//     i18n bundle is precisely what would have failed to land us
//     here; reaching for it again is a footgun.
//
// Privacy: the user sees a generic message and an optional reference
// id. The actual error and digest are forwarded to the observability
// shim (Phase 4 swap target) — never to console in production.
//
// Next.js automatically injects <meta name="robots" content="noindex">
// for pages returning a non-200 status, but global-error returns 500
// from the inside-out path, so we set it explicitly via the inline
// <meta> below to be safe.

import { useEffect } from "react";

// Hard-coded hex literals — must mirror siteConfig.brand.{background,
// foreground, accent}. Duplicated on purpose; see header.
const BG = "#fbf8f3";
const FG = "#28201a";
const ACCENT = "#b85c38";

import { logError } from "@/lib/observability";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
};

export default function GlobalError({ error, unstable_retry, reset }: GlobalErrorProps) {
  useEffect(() => {
    logError(error, {
      route:
        typeof window !== "undefined" ? window.location.pathname : "unknown",
      digest: error.digest,
      scope: "global",
    });
  }, [error]);

  const handleRetry = () => {
    if (typeof unstable_retry === "function") unstable_retry();
    else if (typeof reset === "function") reset();
  };

  return (
    // global-error owns the entire document. We must emit <html> and
    // <body> ourselves; the root layout has not run.
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        <title>Error — Furnituremodern</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: BG,
          color: FG,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <main
          style={{
            maxWidth: "640px",
            padding: "2rem 1.5rem",
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: ACCENT,
              margin: 0,
            }}
          >
            Furnituremodern
          </p>
          <h1
            style={{
              marginTop: "0.75rem",
              marginBottom: 0,
              fontSize: "2rem",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: FG,
              opacity: 0.85,
            }}
          >
            We hit an unexpected error. Please reload, or go back to the
            homepage.
          </p>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={handleRetry}
              style={{
                appearance: "none",
                border: "none",
                borderRadius: "0.5rem",
                backgroundColor: FG,
                color: BG,
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- using a raw <a> on purpose: this file replaces the root layout when active, so importing next/link would re-trigger the same boot path that just crashed. The onClick handler also forces a hard reload via window.location.assign for the same reason. */}
            <a
              href="/"
              onClick={(e) => {
                // Hard reload — the SPA router that would handle a
                // soft navigation may itself be the broken thing that
                // landed us here.
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.location.assign("/");
                }
              }}
              style={{
                display: "inline-block",
                borderRadius: "0.5rem",
                border: `1px solid ${FG}`,
                color: FG,
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                marginTop: "2.5rem",
                fontSize: "0.75rem",
                color: FG,
                opacity: 0.6,
              }}
            >
              Reference:{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                {error.digest}
              </span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
