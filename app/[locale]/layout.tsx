// Locale layout. Wraps every URL under /[locale]/...
//
// Why is the html/body tag missing from this file? They live in
// app/layout.tsx (the true root). Putting them here would produce
// nested <html> tags. We update the document lang attribute via a
// client-side effect inside <HtmlLangSync /> so screen readers and
// crawlers running JS see the right language.

import type { Metadata } from "next";
import { ViewTransition } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/json-ld";
import { HtmlLangSync } from "@/components/layout/html-lang-sync";
import { Banner as CookieConsent } from "@/components/consent/banner";
import { AnalyticsLoader } from "@/components/analytics-loader";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { organizationJsonLd, websiteJsonLd } from "@/lib/schema";
import { siteConfig, absoluteUrl } from "@/lib/site-config";
import { routing, type Locale } from "@/i18n/routing";

// Tell Next.js to statically generate every supported locale at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Static metadata that applies to the whole [locale] tree.
// metadataBase is repeated here in case Next chooses not to merge the
// root layout's metadata into the per-locale tree.
//
// alternates.types announces /llms-full.txt as a text/plain alternate
// of every locale page. AI crawlers that scan <head> for LLM-readable
// indexes pick this up; ordinary search crawlers ignore it.
export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  robots: { index: true, follow: true },
  alternates: {
    types: {
      "text/plain": absoluteUrl("/llms-full.txt"),
    },
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 1. Validate the locale. If the URL contains an unknown locale, 404.
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as Locale;

  // 2. Tell next-intl which locale this request is for. Required for
  //    static generation; without it, getTranslations() throws.
  setRequestLocale(locale);

  // Read the per-request nonce that proxy.ts injected. Passed into
  // every component that emits an inline script tag so the strict
  // production CSP doesn't block them.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      {/* Keeps document.documentElement.lang in sync with the active locale. */}
      <HtmlLangSync locale={locale} />

      {/* Site-wide JSON-LD: Organization + WebSite. */}
      <JsonLd id="ld-organization" data={organizationJsonLd()} nonce={nonce} />
      <JsonLd id="ld-website" data={websiteJsonLd(locale)} nonce={nonce} />

      <NextIntlClientProvider>
        <Header />
        {/* React's <ViewTransition> activates the browser View
            Transitions API on every route change. We wrap just the
            <main> content so the persistent header/footer stay
            anchored — the page content crossfades while chrome
            stays put. Browsers without View Transitions API support
            no-op silently; prefers-reduced-motion is honored via
            globals.css. The experimental viewTransition flag in
            next.config.ts must remain enabled. */}
        <main id="main-content">
          <ViewTransition>{children}</ViewTransition>
        </main>
        <Footer />
        <CookieConsent />
        <AnalyticsLoader nonce={nonce} />
        <PageViewTracker locale={locale} />
        {/* First-party RUM beacon. Sends anonymous Web Vitals to
            /api/vitals (no consent required — see route comment) and
            also fans out a "web_vitals" analytics event that's gated
            on cookie consent inside track(). */}
        <WebVitalsReporter />
      </NextIntlClientProvider>
    </>
  );
}
