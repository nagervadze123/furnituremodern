// Site footer — Phase 5 Task 5.7 redesign.
//
// Five-column desktop grid (mobile stack):
//   1. Brand monogram + name + short tagline (spans 2 cols).
//   2. Explore — Home, all featured categories, Search.
//   3. Customer — Privacy, Manage cookies, Contact mailto.
//   4. Visit — full address, opening hours, phone, email.
//   5. Connect — social links (Instagram, Facebook).
//
// Bottom band:
//   • © current year + legal name on the left.
//   • LanguageSwitcher mirroring the header on the right.
//
// Server component throughout. The only client island is
// LanguageSwitcher (uses usePathname) and ManageLink (cookie sheet).

import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { FacebookIcon, InstagramIcon } from "./social-icons";
import { ManageLink } from "@/components/consent/manage-link";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site-config";
import { getFeaturedNavCategories } from "@/lib/data/categories";
import type { Locale } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = (await getLocale()) as Locale;
  const navCats = await getFeaturedNavCategories(locale);

  const year = new Date().getFullYear();

  // Single class for every clickable footer line. Generous min-h keeps
  // each row finger-tappable without a separate wrapper. -mx-2 px-2
  // keeps visual alignment flush with the column headings while still
  // padding the focus ring outwards.
  const linkClass =
    "-mx-2 inline-flex min-h-10 items-center break-words rounded px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // Map the structured `openingHours` array onto two visible rows.
  // We collapse the per-day list into a single ranged label per
  // schedule entry — covers the typical Mon–Fri / Sat / Closed Sun
  // pattern without rendering five identical rows. Cast each entry's
  // `days` to a generic string[] because `as const` in site-config
  // narrows it to a literal tuple per row, which would refuse the
  // `.includes("Monday")` call against a row that only has "Saturday".
  const weekdayHours = siteConfig.contact.openingHours.find((row) =>
    (row.days as readonly string[]).includes("Monday")
  );
  const saturdayHours = siteConfig.contact.openingHours.find((row) =>
    (row.days as readonly string[]).includes("Saturday")
  );
  const sundayHours = siteConfig.contact.openingHours.find((row) =>
    (row.days as readonly string[]).includes("Sunday")
  );

  return (
    <footer className="mt-24 border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-5 md:gap-8 md:px-6 md:py-16">
        {/* Col 1 — brand + tagline (spans 2 cols on desktop). */}
        <div className="min-w-0 md:col-span-2">
          <BrandMark className="mb-4" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        {/* Col 2 — Explore. */}
        <div className="min-w-0">
          <nav aria-labelledby="footer-explore-heading" className="min-w-0">
            <h2
              id="footer-explore-heading"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
            >
              {t("explore_label")}
            </h2>
            <ul className="mt-4 flex flex-col text-sm">
              <li>
                <Link href="/" className={linkClass}>
                  {t("home_link")}
                </Link>
              </li>
              {navCats.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`} className={linkClass}>
                    {c.name[locale]}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/search" className={linkClass}>
                  {t("search_link")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Col 3 — Customer. */}
        <div className="min-w-0">
          <nav aria-labelledby="footer-customer-heading" className="min-w-0">
            <h2
              id="footer-customer-heading"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
            >
              {t("customer_label")}
            </h2>
            <ul className="mt-4 flex flex-col text-sm">
              <li>
                <Link href="/privacy" className={linkClass}>
                  {t("privacy_link")}
                </Link>
              </li>
              <li>
                <ManageLink className={linkClass} />
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className={linkClass}
                >
                  {t("contact")}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Col 4 — Visit (address, hours, phone, email). */}
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
            {t("visit_label")}
          </h2>
          <address className="mt-4 flex flex-col gap-3 text-sm not-italic text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
              />
              <div className="min-w-0 break-words">
                <p>{siteConfig.contact.address.street}</p>
                <p>
                  {siteConfig.contact.address.city},{" "}
                  {siteConfig.contact.address.postalCode}
                </p>
              </div>
            </div>

            {(weekdayHours || saturdayHours) && (
              <div className="flex items-start gap-2">
                <Clock
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/70">
                    {t("hours_label")}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {weekdayHours && (
                      <li className="break-words">
                        <span className="text-foreground/70">
                          {t("hours_weekdays")}:
                        </span>{" "}
                        <span>
                          {weekdayHours.opens} – {weekdayHours.closes}
                        </span>
                      </li>
                    )}
                    {saturdayHours && (
                      <li className="break-words">
                        <span className="text-foreground/70">
                          {t("hours_saturday")}:
                        </span>{" "}
                        <span>
                          {saturdayHours.opens} – {saturdayHours.closes}
                        </span>
                      </li>
                    )}
                    {!sundayHours && (
                      <li className="break-words">
                        <span className="text-foreground/70">
                          {t("hours_sunday")}:
                        </span>{" "}
                        <span>{t("hours_closed")}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Phone
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
              />
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="-mx-1 inline-flex min-h-9 items-center rounded px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {siteConfig.contact.phone}
              </a>
            </div>

            <div className="flex items-start gap-2">
              <Mail
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60"
              />
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="-mx-1 inline-flex min-h-9 items-center break-all rounded px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </address>
        </div>

        {/* Col 5 — Connect (social). */}
        <div className="min-w-0">
          <nav aria-labelledby="footer-connect-heading" className="min-w-0">
            <h2
              id="footer-connect-heading"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground"
            >
              {t("connect_label")}
            </h2>
            <ul className="mt-4 flex flex-col text-sm">
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <InstagramIcon className="h-4 w-4 text-foreground/60" />
                  Instagram
                  <span className="sr-only"> {t("opens_in_new_window")}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <FacebookIcon className="h-4 w-4 text-foreground/60" />
                  Facebook
                  <span className="sr-only"> {t("opens_in_new_window")}</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom band — © left, language switcher right. */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground pb-safe-4 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="break-words">
            © {year} {siteConfig.legalName}. {t("rights")}.
          </p>
          <LanguageSwitcher className="self-start md:self-auto" />
        </div>
      </div>
    </footer>
  );
}
