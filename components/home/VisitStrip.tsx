// Home pre-footer "visit / contact" band. Phase 5 Task 5.
//
// Full-bleed soft-accent band that closes out the home page with a
// single call to action: visit the showroom (or contact). Background
// uses surface-300 (paper panel) so the band reads as a deliberate
// stop without competing with the brand accent.
//
// CTA points at the contact email from siteConfig — keeps the
// information surface consistent with the footer (which renders the
// same email).

import { MapPin } from "lucide-react";

import { getTranslations } from "next-intl/server";

import {
  Body,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { siteConfig } from "@/lib/site-config";

export async function VisitStrip() {
  const t = await getTranslations("home.visit");

  return (
    <Section
      aria-labelledby="visit-heading"
      // Soft warm-paper backdrop sets this band apart from the
      // surrounding sections without competing for attention.
      className="bg-[var(--color-surface-300,oklch(0.96_0.008_75))]"
    >
      <Container variant="default">
        <RevealStagger
          as="div"
          className="flex flex-col items-center gap-5 text-center"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft,oklch(0.92_0.04_38))] text-[var(--color-accent-strong,oklch(0.50_0.13_38))]"
          >
            <MapPin className="h-7 w-7" />
          </span>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Heading id="visit-heading" variant={1} as="h2" className="max-w-2xl">
            {t("heading")}
          </Heading>
          <Body variant="lg" className="max-w-xl">
            {t("body")}
          </Body>
          <Reveal variant="slideUp">
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent-strong,oklch(0.50_0.13_38))] px-7 text-base font-medium text-white shadow-sm motion-safe:transition-transform motion-safe:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("cta")}
            </a>
          </Reveal>
          <p className="text-sm text-[var(--color-ink-60)]">
            {siteConfig.contact.address.street},{" "}
            {siteConfig.contact.address.city}
          </p>
        </RevealStagger>
      </Container>
    </Section>
  );
}
