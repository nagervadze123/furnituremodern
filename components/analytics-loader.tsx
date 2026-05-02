"use client";

// Loads the third-party analytics script tags AFTER the visitor accepts
// cookies, and only for providers whose env var is configured.
//
// Provider routing (matches lib/analytics/config.ts):
//   • NEXT_PUBLIC_GTM_ID set        → GTM container loads, GA4 + Meta
//                                      direct loaders skip (GTM owns
//                                      those tags)
//   • NEXT_PUBLIC_GTM_ID unset      → GA4 / Meta direct loaders fire
//                                      individually if their env var
//                                      is set
//   • NEXT_PUBLIC_PLAUSIBLE_DOMAIN  → Plausible always loads when set
//
// Consent integration:
//   • No script renders before consent === "accepted".
//   • When consent flips to accepted after page load, scripts mount
//     immediately because the component re-renders via useConsent().
//   • On the same flip, we fire Consent Mode v2 update so any
//     already-loaded gtag re-evaluates with granted signals.
//
// CSP: each <Script> carries the per-request nonce passed in by
// app/[locale]/layout.tsx. The strict-dynamic policy in lib/security/csp.ts
// lets these chained loaders pull their downstream bundles.

import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "./cookie-consent";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { consentToMode, updateGtagConsent } from "@/lib/analytics/consent";

type Props = {
  nonce?: string;
};

export function AnalyticsLoader({ nonce }: Props) {
  const consent = useConsent();
  const config = getAnalyticsConfig();

  // When consent changes after a script is already loaded, push the
  // updated Consent Mode v2 signals into gtag. No-op if gtag isn't
  // present yet — the script's own consent="default" line is the
  // pre-consent baseline.
  useEffect(() => {
    if (consent === null) return;
    updateGtagConsent(consentToMode(consent));
  }, [consent]);

  if (consent !== "accepted") return null;

  // Preconnect to provider hosts only once consent is granted. These
  // <link> tags react-hoist into <head> so the browser starts the
  // TCP+TLS handshake while the <Script> tags below are still queued.
  // We do NOT preconnect before consent — that would defeat the
  // whole point of the consent gate.
  return (
    <>
      {(config.enabled.gtm || config.enabled.ga4) ? (
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
      ) : null}
      {config.enabled.meta ? (
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
      ) : null}
      {config.enabled.plausible ? (
        <link rel="preconnect" href="https://plausible.io" crossOrigin="" />
      ) : null}

      {/* GTM loads once and owns GA4 + Meta tags inside the container. */}
      {config.enabled.gtm && config.gtmId ? (
        <Script
          id="fm-gtm"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
              var f=document.getElementsByTagName('script')[0],
                  j=document.createElement('script');
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id=${config.gtmId}';
              f.parentNode.insertBefore(j,f);
            `,
          }}
        />
      ) : null}

      {/* Direct GA4 (skipped in GTM mode). */}
      {config.enabled.ga4 && config.ga4Id ? (
        <>
          <Script
            id="fm-ga4-loader"
            strategy="afterInteractive"
            nonce={nonce}
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`}
          />
          <Script
            id="fm-ga4-init"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('consent', 'default', ${JSON.stringify(
                  consentToMode(consent)
                )});
                gtag('config', '${config.ga4Id}', { send_page_view: false });
              `,
            }}
          />
        </>
      ) : null}

      {/* Direct Meta Pixel (skipped in GTM mode). */}
      {config.enabled.meta && config.metaPixelId ? (
        <Script
          id="fm-meta-pixel"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${config.metaPixelId}');
            `,
          }}
        />
      ) : null}

      {/* Plausible — independent of GTM mode. data-api avoids ad-blocker
          path matching on /js/script.js, but we keep the standard URL
          since custom proxies are out of scope. */}
      {config.enabled.plausible && config.plausibleDomain ? (
        <Script
          id="fm-plausible"
          strategy="afterInteractive"
          nonce={nonce}
          src="https://plausible.io/js/script.manual.js"
          data-domain={config.plausibleDomain}
        />
      ) : null}

      {/* Plausible's manual mode requires us to expose a queue function
          before the script loads, then it auto-flushes on init. */}
      {config.enabled.plausible && config.plausibleDomain ? (
        <Script
          id="fm-plausible-queue"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) };`,
          }}
        />
      ) : null}
    </>
  );
}
