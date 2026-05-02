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

  return (
    <footer className="mt-24 border-t border-border/50 bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-5 md:px-6">
        <div className="md:col-span-2">
          <p className="font-display text-lg font-semibold text-foreground">
            {siteConfig.name}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.shortDescription[locale]}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("explore")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {/* Driven by lib/navigation.ts so the footer stays in sync
                with the header automatically. */}
            {footerExploreNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {tNav(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("contact")}
          </h2>
          <address className="mt-4 space-y-2 text-sm not-italic text-muted-foreground">
            <p>{siteConfig.contact.address.street}</p>
            <p>
              {siteConfig.contact.address.city},{" "}
              {siteConfig.contact.address.postalCode}
            </p>
            <p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="transition-colors hover:text-foreground"
              >
                {siteConfig.contact.email}
              </a>
            </p>
            <p>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-foreground"
              >
                {siteConfig.contact.phone}
              </a>
            </p>
          </address>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("legal")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/privacy"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("privacy_link")}
              </Link>
            </li>
            <li>
              {/* Re-opens the cookie settings sheet. Client island
                  inside an otherwise server-rendered footer. */}
              <ManageLink className="text-muted-foreground transition-colors hover:text-foreground" />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            © {year} {siteConfig.legalName}. {t("rights")}.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Instagram
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
