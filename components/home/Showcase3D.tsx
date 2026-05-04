// Home 3D showcase strip.
//
// Live, interactive 3D rendering of a stylized armchair so visitors
// land on the home page and immediately understand "this studio makes
// real furniture, in three dimensions." The heavy three.js / r3f
// runtime is hosted in a client child (Showcase3DLazy) which
// dynamic-imports the actual <Canvas/> with ssr:false — that keeps
// the home-page server bundle untouched and skips three.js entirely
// for users with prefers-reduced-motion.
//
// Layout:
//   • Mobile: text first, then the 3D viewer below it.
//   • Desktop: 5/12 prose on the left, 7/12 viewer on the right.
//
// SEO:
//   • The headline is an <h2> in the SSR HTML so crawlers see it.
//   • The 3D viewer is a progressive enhancement — content above the
//     fold (heading + body + CTA) renders without it.

import { getTranslations } from "next-intl/server";

import {
  Body,
  Container,
  Eyebrow,
  Heading,
  Section,
} from "@/components/design";
import { Reveal, RevealStagger } from "@/lib/motion";
import { Showcase3DLazy } from "./Showcase3DLazy";

export async function Showcase3D() {
  const t = await getTranslations("home.showcase_3d");

  return (
    <Section
      aria-labelledby="showcase-3d-heading"
      className="bg-[var(--color-surface-100,oklch(0.98_0.006_78))]"
    >
      <Container variant="wide">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-14 lg:gap-20">
          {/* Prose column. Order 2 on desktop so the viewer leads
              right; order 1 on mobile so the heading reads first. */}
          <RevealStagger
            as="div"
            className="order-2 flex min-w-0 flex-col gap-5 md:order-1 md:col-span-5"
          >
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <Heading
              id="showcase-3d-heading"
              variant={1}
              as="h2"
              className="break-words"
            >
              {t("heading")}
            </Heading>
            <Body variant="lg" className="max-w-prose">
              {t("body")}
            </Body>
            <p className="text-sm text-[var(--color-ink-60)]">
              {t("hint")}
            </p>
          </RevealStagger>

          {/* Viewer column. */}
          <Reveal
            variant="imageReveal"
            threshold={0.05}
            className="order-1 min-w-0 md:order-2 md:col-span-7"
          >
            <Showcase3DLazy />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
