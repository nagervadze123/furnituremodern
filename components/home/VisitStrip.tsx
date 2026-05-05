// Phase 5b pre-footer "visit / contact" band.
//
// Closing-punctuation section: full-width ink-900 background (deep
// inverse of the page bone-50), py-32 desktop / py-20 mobile. Text is
// centred inside a max-w-3xl column. Eyebrow paints bone-50/55 — a
// muted-on-dark variant that reads at ~5:1 against ink-900 (AA-clear).
// The display-2 headline reads "Tbilisi, {address}" and the body
// lines beneath show opening hours + a `tel:` link to the phone
// number, both pulled from siteConfig.contact.
//
// Single CTA — "Send a message", styled as outlined-inverse:
//   • rest:   transparent bg, 1px bone-50 border, bone-50 text
//   • hover:  bone-50 bg, ink-900 text
// Sharp edges, no border-radius (editorial).
//
// Section anchor: id="visit". The IssueRibbon's "V. Visit" link
// jumps here.

import { getLocale, getTranslations } from "next-intl/server";

import {
  Body,
  Container,
  Display,
  Eyebrow,
  Section,
} from "@/components/design";
import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/routing";

// Format the standard openingHoursSpecification array into a single
// human line per locale. We only render the first weekday-block + the
// Saturday block; the seeded config is closed Sunday so we omit it
// rather than print "Sunday: closed" on a marquee section.
function formatOpeningHours(locale: Locale): string {
  // siteConfig is `as const`, so each slot's `days` is a readonly
  // literal tuple. We cast to `readonly string[]` for the includes()
  // check so TypeScript doesn't narrow the predicate type to `never`.
  const hasDay = (slot: { days: readonly string[] }, name: string): boolean =>
    slot.days.includes(name);
  const weekdayBlock = siteConfig.contact.openingHours.find(
    (slot) => hasDay(slot, "Monday") || hasDay(slot, "Tuesday")
  );
  const saturdayBlock = siteConfig.contact.openingHours.find((slot) =>
    hasDay(slot, "Saturday")
  );

  // Locale-correct labels live in messages files (footer.hours_*); but
  // the visit strip is a thin marquee — we rebuild a short summary
  // inline so a missing config slot doesn't blank the section out.
  const weekdayLabel = locale === "ka" ? "ორშ–პარ" : "Mon–Fri";
  const saturdayLabel = locale === "ka" ? "შაბ" : "Sat";

  const parts: string[] = [];
  if (weekdayBlock) {
    parts.push(`${weekdayLabel} ${weekdayBlock.opens}–${weekdayBlock.closes}`);
  }
  if (saturdayBlock) {
    parts.push(`${saturdayLabel} ${saturdayBlock.opens}–${saturdayBlock.closes}`);
  }
  return parts.join(" / ");
}

export async function VisitStrip() {
  const t = await getTranslations("home.visit");
  const locale = (await getLocale()) as Locale;

  const street = siteConfig.contact.address.street;
  const phone = siteConfig.contact.phone;
  const email = siteConfig.contact.email;
  const hoursLine = formatOpeningHours(locale);

  // schema.org LocalBusiness already carries the same address, phone,
  // and hours — this section is the visible mirror. Keeping the values
  // single-sourced means a config edit propagates here without churn.
  return (
    <Section
      id="visit"
      aria-labelledby="visit-heading"
      // Deep ink full-bleed band — color inversion from the rest of the
      // page. py- spacing is generous (32 desktop / 20 mobile) so the
      // section reads as a deliberate stop, not a strip.
      className="scroll-mt-20 bg-[var(--color-ink-900)] py-20 md:py-32"
    >
      <Container variant="default" className="max-w-3xl">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Phase 6 Slice 0 — bone-50 at 55% opacity reads as a muted
              eyebrow on the ink-900 surface (~5:1, AA-clear). The
              prior terracotta-500 paint here measured 3.88:1 — fails
              AA at 12 px. See `docs/design/contrast.md`. */}
          <Eyebrow className="!text-[var(--color-bone-50)]/55">
            {t("eyebrow")}
          </Eyebrow>
          <Display
            id="visit-heading"
            variant={2}
            as="h2"
            // !text-[bone-50] overrides the default ink-100 from Display.
            className="!text-[var(--color-bone-50)] break-words"
          >
            {t("heading_prefix")}, {street}
          </Display>
          <Body variant="lg" className="!text-[var(--color-ink-300)]">
            {hoursLine}
          </Body>
          <Body variant="lg" className="!text-[var(--color-ink-300)]">
            {/* tel: keeps phone tappable on mobile. Numerals are kept
                in their original form — Intl number formatting on a
                phone string is brittle, and operators usually want the
                exact display they entered in siteConfig. */}
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="transition-colors hover:text-[var(--color-bone-50)]"
            >
              {phone}
            </a>
          </Body>
          {/* CTA — outlined inverse, sharp edges. The mailto: subject
              is consistent with the project footer pattern. */}
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(
              "Sadguri — შეკითხვა"
            )}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-none border border-[var(--color-bone-50)] bg-transparent px-7 py-[14px] text-base font-medium text-[var(--color-bone-50)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-bone-50)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink-900)]"
          >
            {t("cta")}
          </a>
        </div>
      </Container>
    </Section>
  );
}
