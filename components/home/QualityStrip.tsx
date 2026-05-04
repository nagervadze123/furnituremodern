// Home quality / process strip. Phase 5 Task 5.
//
// Three trust signals in a row: handcrafted, local materials, warranty.
// Mobile stacks to a single column. Each row gets a Lucide icon, a
// short heading, and a one-line body — every string is locale-driven.
//
// No interactive surface here — pure prose with iconography. No
// animation either, just a container Reveal so the strip fades in as
// it scrolls past.

import { Hammer, Leaf, ShieldCheck } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { getTranslations } from "next-intl/server";

import {
  Body,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";

type Item = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  headingKey: "item1.heading" | "item2.heading" | "item3.heading";
  bodyKey: "item1.body" | "item2.body" | "item3.body";
};

// Icon → translation-key mapping. The icons are decorative (the
// adjacent heading carries the meaning) and therefore aria-hidden
// inside the row component below.
const ITEMS: Item[] = [
  { icon: Hammer, headingKey: "item1.heading", bodyKey: "item1.body" },
  { icon: Leaf, headingKey: "item2.heading", bodyKey: "item2.body" },
  { icon: ShieldCheck, headingKey: "item3.heading", bodyKey: "item3.body" },
];

export async function QualityStrip() {
  const t = await getTranslations("home.quality");

  return (
    <Section aria-labelledby="quality-heading">
      <Container variant="wide">
        <RevealStagger
          as="div"
          className="mb-10 flex flex-col gap-3 md:mb-14 md:max-w-2xl"
        >
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Heading id="quality-heading" variant={1} as="h2">
            {t("heading")}
          </Heading>
        </RevealStagger>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-14">
          {ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal key={idx} variant="slideUp">
                <div className="flex flex-col gap-4">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft,oklch(0.92_0.04_38))] text-[var(--color-accent-strong,oklch(0.50_0.13_38))]"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <Heading variant={3} as="h3">
                    {t(item.headingKey)}
                  </Heading>
                  <Body variant="default" className="max-w-md">
                    {t(item.bodyKey)}
                  </Body>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
