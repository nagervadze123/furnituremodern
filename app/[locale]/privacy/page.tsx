// Bilingual privacy policy — /[locale]/privacy.
//
// Indexable, single <h1>, semantic HTML, BreadcrumbList JSON-LD.
// Effective date is sourced from siteConfig.privacyPolicyUpdatedAt.
// Copy is plain-language and intentionally cautious — every third-
// party recipient is described in conditional ("if we enable …")
// language because nothing is wired today.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type BreadcrumbCrumb } from "@/components/sections/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ManageLink } from "@/components/consent/manage-link";
import { breadcrumbListJsonLd } from "@/lib/schema";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { routing, type Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("page_title"),
    description: t("page_description"),
    robots: { index: true, follow: true },
    alternates: {
      canonical: absoluteUrl(`/${locale}/privacy`),
      languages: {
        ka: absoluteUrl("/ka/privacy"),
        en: absoluteUrl("/en/privacy"),
        "x-default": absoluteUrl(`/${routing.defaultLocale}/privacy`),
      },
    },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: "privacy" }),
    getTranslations({ locale, namespace: "breadcrumbs" }),
  ]);

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const crumbs: BreadcrumbCrumb[] = [
    { label: tBreadcrumbs("home"), href: "/" },
    { label: tBreadcrumbs("privacy") },
  ];

  // Format the human-readable "Last updated" label per locale.
  // The <time dateTime=…> attribute always carries the raw ISO date
  // so machines have a stable handle regardless of locale formatting.
  const updatedAt = siteConfig.privacyPolicyUpdatedAt;
  const formattedDate = new Intl.DateTimeFormat(
    locale === "ka" ? "ka-GE" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" }
  ).format(new Date(updatedAt));

  return (
    <>
      <JsonLd
        id="ld-privacy-breadcrumbs"
        data={breadcrumbListJsonLd([
          { name: tBreadcrumbs("home"), url: `/${locale}` },
          { name: tBreadcrumbs("privacy"), url: `/${locale}/privacy` },
        ])}
        nonce={nonce}
      />

      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <header>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {t("page_title")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("effective_date_label")}:{" "}
            <time dateTime={updatedAt}>{formattedDate}</time>
          </p>
        </header>

        {/* 1. Who we are */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.who_we_are.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.who_we_are.body")}
          </p>
          <address className="mt-3 not-italic text-sm text-muted-foreground">
            <p>{siteConfig.legalName}</p>
            <p>{siteConfig.contact.address.street}</p>
            <p>
              {siteConfig.contact.address.city},{" "}
              {siteConfig.contact.address.postalCode}
            </p>
            <p>{siteConfig.contact.address.country}</p>
            <p className="mt-2">
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                {siteConfig.contact.email}
              </a>
            </p>
          </address>
        </section>

        {/* 2. What data we collect */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.what_we_collect.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.what_we_collect.necessary")}
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.what_we_collect.analytics")}
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.what_we_collect.marketing")}
          </p>
        </section>

        {/* 3. Why we collect it */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.why_we_collect.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.why_we_collect.body")}
          </p>
        </section>

        {/* 4. How long we keep it */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.retention.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.retention.intro")}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
            <li>{t("sections.retention.web_vitals")}</li>
            <li>{t("sections.retention.analytics_events")}</li>
            <li>{t("sections.retention.redirects")}</li>
          </ul>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.retention.future_features")}
          </p>
        </section>

        {/* 5. Who we share it with */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.third_parties.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.third_parties.intro")}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
            <li>{t("sections.third_parties.ga")}</li>
            <li>{t("sections.third_parties.gtm")}</li>
            <li>{t("sections.third_parties.meta")}</li>
            <li>{t("sections.third_parties.plausible")}</li>
          </ul>
        </section>

        {/* 6. Your rights */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.your_rights.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.your_rights.intro")}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
            <li>{t("sections.your_rights.access")}</li>
            <li>{t("sections.your_rights.rectification")}</li>
            <li>{t("sections.your_rights.erasure")}</li>
            <li>{t("sections.your_rights.restriction")}</li>
            <li>{t("sections.your_rights.portability")}</li>
            <li>{t("sections.your_rights.objection")}</li>
          </ul>
        </section>

        {/* 7. Cookies we set */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.cookies.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.cookies.intro")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-4 font-semibold text-foreground">
                    {t("sections.cookies.table_name")}
                  </th>
                  <th className="py-2 pr-4 font-semibold text-foreground">
                    {t("sections.cookies.table_purpose")}
                  </th>
                  <th className="py-2 font-semibold text-foreground">
                    {t("sections.cookies.table_duration")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-4 font-mono text-foreground">
                    fm_consent
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {t("sections.cookies.fm_consent_purpose")}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {t("sections.cookies.fm_consent_duration")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {t("sections.cookies.manage_intro")}{" "}
            <ManageLink className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline" />
          </p>
        </section>

        {/* 8. Contact us */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.contact.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.contact.body")}
          </p>
          <address className="mt-3 not-italic text-sm text-muted-foreground">
            <p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                {siteConfig.contact.email}
              </a>
            </p>
            <p>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                {siteConfig.contact.phone}
              </a>
            </p>
            <p>{siteConfig.contact.address.street}</p>
            <p>
              {siteConfig.contact.address.city},{" "}
              {siteConfig.contact.address.postalCode},{" "}
              {siteConfig.contact.address.country}
            </p>
          </address>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("sections.contact.response_note")}
          </p>
        </section>

        {/* 9. Updates to this policy */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("sections.updates.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t("sections.updates.body")}{" "}
            <time dateTime={updatedAt} className="font-medium text-foreground">
              {formattedDate}
            </time>
            .
          </p>
        </section>
      </article>
    </>
  );
}
