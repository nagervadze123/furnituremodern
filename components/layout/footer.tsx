// Site footer: address, contact, navigation, social, locale list.

import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site-config";
import { footerExploreNav } from "@/lib/navigation";
import { ManageLink } from "@/components/consent/manage-link";
import type { Locale } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const locale = (await getLocale()) as Locale;

  const year = new Date().getFullYear();

  // Each footer link uses the same shape: a block-level row with
  // generous vertical padding, so the link is finger-tappable without
  // a separate touch-target wrapper. Negative `-mx-2 px-2` keeps the
  // visible alignment flush with the column heading.
  const footerLinkClass =
    "-mx-2 inline-flex min-h-10 items-center break-words rounded px-2 text-muted-foreground transition-colors hover:text-foreground";

  return (
    <footer className="mt-24 border-t border-border/50 bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-5 md:px-6">
        <div className="min-w-0 md:col-span-2">
          <p className="font-display text-lg font-semibold text-foreground">
            {siteConfig.name}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.shortDescription[locale]}
          </p>
        </div>

        <div className="min-w-0">
          {/*
            Wrapped in <nav> with aria-label so AT users get a labelled
            "Explore" landmark in the page outline, distinct from the
            primary header nav. WCAG 1.3.1 / 4.1.2 (Landmark roles).
            The visible <h2> is still rendered for sighted users; nav
            label and heading text intentionally match.
          */}
          <nav aria-labelledby="footer-explore-heading" className="min-w-0">
            <h2
              id="footer-explore-heading"
              className="text-sm font-semibold text-foreground"
            >
              {t("explore")}
            </h2>
            <ul className="mt-3 flex flex-col text-sm">
              {/* Driven by lib/navigation.ts so the footer stays in sync
                  with the header automatically. */}
              {footerExploreNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {tNav(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {t("contact")}
          </h2>
          {/* `not-italic` keeps the legal <address> visually flush.
              `break-words` defends the column against very long emails
              or phone formats. Tappable rows keep the same min-height
              as the explore nav. */}
          <address className="mt-3 flex flex-col text-sm not-italic text-muted-foreground">
            <p className="py-1 break-words">{siteConfig.contact.address.street}</p>
            <p className="py-1 break-words">
              {siteConfig.contact.address.city},{" "}
              {siteConfig.contact.address.postalCode}
            </p>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className={footerLinkClass + " break-all"}
            >
              {siteConfig.contact.email}
            </a>
            <a
              href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
              className={footerLinkClass}
            >
              {siteConfig.contact.phone}
            </a>
          </address>
        </div>

        <div className="min-w-0">
          {/* Same labelled-landmark pattern as the Explore section. */}
          <nav aria-labelledby="footer-legal-heading" className="min-w-0">
            <h2
              id="footer-legal-heading"
              className="text-sm font-semibold text-foreground"
            >
              {t("legal")}
            </h2>
            <ul className="mt-3 flex flex-col text-sm">
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  {t("privacy_link")}
                </Link>
              </li>
              <li>
                {/* Re-opens the cookie settings sheet. Client island
                    inside an otherwise server-rendered footer. */}
                <ManageLink className={footerLinkClass} />
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-border/50">
        {/* `pb-safe-4` reserves at least 1rem of bottom padding plus the
            iOS home-indicator inset, so the © line never sits flush
            with the indicator on a notched phone. */}
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground pb-safe-4 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="break-words">
            © {year} {siteConfig.legalName}. {t("rights")}.
          </p>
          {/*
            Social links open in a new window. WCAG 3.2.5 (AAA, Change
            on Request) recommends warning users when a link leaves the
            current document. We append a visually-hidden suffix per
            link so screen readers announce "Instagram, opens in a new
            window" without altering the visible UI. aria-label on the
            <nav> identifies this as the social-media landmark.
          */}
          <nav
            aria-label={t("social_label")}
            className="flex flex-wrap items-center gap-x-4 gap-y-1"
          >
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-2 inline-flex min-h-10 items-center rounded px-2 transition-colors hover:text-foreground"
            >
              Instagram
              <span className="sr-only"> {t("opens_in_new_window")}</span>
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-2 inline-flex min-h-10 items-center rounded px-2 transition-colors hover:text-foreground"
            >
              Facebook
              <span className="sr-only"> {t("opens_in_new_window")}</span>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
