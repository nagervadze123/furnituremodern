// Site footer — Phase 6 Slice 3 editorial dark-surface port.
//
// Visual reference: `_design-reference/components/site-chrome.jsx:120-196`.
//
// Surface: ink-900 background, bone-100 body text. The grid template
// `2.2fr 1fr 1fr 1fr 1fr` (brand wider, four masthead columns equal)
// reads as a magazine colophon rather than a five-equal-bay utility
// footer. A single 1 px hairline at bone-100/14 separates the masthead
// from the bottom band.
//
// Five-column desktop grid (mobile stack):
//   1. Brand monogram + name + tagline + italic English caption
//      (spans the wider 2.2fr track; conceptually one column).
//   2. Explore — Home, all featured categories, Search.
//   3. Customer — Privacy, Manage cookies, Contact mailto.
//   4. Visit — full address, opening hours, phone, email.
//   5. Connect — social links (Instagram, Facebook).
//
// Bottom band:
//   • © current year + legal name on the left.
//   • LanguageSwitcher mirroring the header on the right.
//
// All link hover states are pure CSS :hover with brass-500 — no
// inline JS mouse handlers (precommit invariant 4 forbids them). The
// `linkClass` resting state paints bone-100 with a transparent 1 px
// underline; on hover the underline animates in at brass-500. brass-500
// on ink-900 measures 5.02:1 (AA-clear); see docs/design/contrast.md.
//
// Server component throughout. The only client islands are
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

  // Single class for every clickable footer line. bone-100 resting,
  // brass-500 on hover/focus, paired with a 1 px underline that fades
  // from transparent to brass-500. min-h-10 keeps each row finger-
  // tappable without an extra wrapper.
  const linkClass =
    "inline-flex min-h-10 items-center break-words border-b border-transparent text-sm leading-relaxed text-[var(--color-bone-100)] transition-colors duration-200 hover:text-[var(--color-brass-500)] hover:border-[var(--color-brass-500)] focus-visible:outline-none focus-visible:text-[var(--color-brass-500)] focus-visible:border-[var(--color-brass-500)]";

  // Eyebrow column heading — 12 px / 0.18em / weight 500 / uppercase,
  // bone-100 at 0.55 alpha (5.49:1 on ink-900, AA-clear). No leading
  // hairline rule on this surface; the masthead block is the rule.
  const headingClass =
    "text-xs font-medium uppercase tracking-[0.18em] text-[rgb(245_240_232/0.55)]";

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
    <footer className="mt-32 bg-[var(--color-ink-900)] text-[var(--color-bone-100)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-20 pb-14 md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr] md:gap-10 md:px-6 md:pt-24">
        {/* Col 1 — brand + tagline + italic English caption. */}
        <div className="min-w-0">
          <BrandMark
            className="mb-5"
            nameClassName="text-[var(--color-bone-100)]"
            tileClassName="border-[rgb(245_240_232/0.16)] bg-[var(--color-bone-100)] text-[var(--color-ink-900)]"
          />
          <p className="max-w-[36ch] text-sm leading-relaxed text-[rgb(245_240_232/0.7)]">
            {t("tagline")}
          </p>
          <p className="mt-3.5 text-xs italic text-[rgb(245_240_232/0.55)]">
            {t("tagline_caption")}
          </p>
        </div>

        {/* Col 2 — Explore. */}
        <div className="min-w-0">
          <nav aria-labelledby="footer-explore-heading" className="min-w-0">
            <h3 id="footer-explore-heading" className={headingClass}>
              {t("explore_label")}
            </h3>
            <ul className="mt-5 flex flex-col text-sm">
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
            <h3 id="footer-customer-heading" className={headingClass}>
              {t("customer_label")}
            </h3>
            <ul className="mt-5 flex flex-col text-sm">
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
          <h3 className={headingClass}>{t("visit_label")}</h3>
          <address className="mt-5 flex flex-col gap-3 text-sm not-italic text-[rgb(245_240_232/0.7)]">
            <div className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(245_240_232/0.55)]"
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
                  className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(245_240_232/0.55)]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-[rgb(245_240_232/0.55)]">
                    {t("hours_label")}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {weekdayHours && (
                      <li className="break-words">
                        <span className="text-[rgb(245_240_232/0.55)]">
                          {t("hours_weekdays")}:
                        </span>{" "}
                        <span>
                          {weekdayHours.opens} – {weekdayHours.closes}
                        </span>
                      </li>
                    )}
                    {saturdayHours && (
                      <li className="break-words">
                        <span className="text-[rgb(245_240_232/0.55)]">
                          {t("hours_saturday")}:
                        </span>{" "}
                        <span>
                          {saturdayHours.opens} – {saturdayHours.closes}
                        </span>
                      </li>
                    )}
                    {!sundayHours && (
                      <li className="break-words">
                        <span className="text-[rgb(245_240_232/0.55)]">
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
                className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(245_240_232/0.55)]"
              />
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="-mx-1 -my-1 inline-flex min-h-11 items-center rounded px-1 py-1 text-[var(--color-bone-100)] transition-colors duration-200 hover:text-[var(--color-brass-500)] focus-visible:outline-none focus-visible:text-[var(--color-brass-500)]"
              >
                {siteConfig.contact.phone}
              </a>
            </div>

            <div className="flex items-start gap-2">
              <Mail
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(245_240_232/0.55)]"
              />
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="-mx-1 -my-1 inline-flex min-h-11 items-center break-all rounded px-1 py-1 text-[var(--color-bone-100)] transition-colors duration-200 hover:text-[var(--color-brass-500)] focus-visible:outline-none focus-visible:text-[var(--color-brass-500)]"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </address>
        </div>

        {/* Col 5 — Connect (social). */}
        <div className="min-w-0">
          <nav aria-labelledby="footer-connect-heading" className="min-w-0">
            <h3 id="footer-connect-heading" className={headingClass}>
              {t("connect_label")}
            </h3>
            <ul className="mt-5 flex flex-col text-sm">
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <InstagramIcon className="h-4 w-4 text-[rgb(245_240_232/0.55)]" />
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
                  <FacebookIcon className="h-4 w-4 text-[rgb(245_240_232/0.55)]" />
                  Facebook
                  <span className="sr-only"> {t("opens_in_new_window")}</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom band — © left, language switcher right.
         Hairline divider at bone-100/14 (1.47:1 — decorative, the
         3:1 floor under SC 1.4.11 only applies to functional UI). */}
      <div className="border-t border-[rgb(245_240_232/0.14)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 pb-safe-4 text-xs tracking-[0.08em] text-[rgb(245_240_232/0.55)] md:flex-row md:items-center md:justify-between md:px-6">
          <p className="break-words">
            © {year} {siteConfig.legalName}. {t("rights")}.
          </p>
          <LanguageSwitcher
            className="self-start [&_span[aria-hidden='true']]:text-[rgb(245_240_232/0.35)] md:self-auto"
            itemClassName="text-[var(--color-bone-100)] hover:text-[var(--color-brass-500)] focus-visible:text-[var(--color-brass-500)] hover:border-[var(--color-brass-500)]"
          />
        </div>
      </div>
    </footer>
  );
}
