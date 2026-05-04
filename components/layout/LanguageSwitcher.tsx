// Language switcher — KA / EN as side-by-side anchors with the
// current locale visually marked. Used in the header desktop nav, the
// mobile drawer, and the footer bottom band.
//
// Why a client component: we read the current pathname so each link
// keeps the user on the same page when they swap locales. next-intl's
// `Link` accepts a `locale` prop that prepends the alternate locale
// segment for us.
//
// Why two anchor links instead of a dropdown: with only two locales,
// a dropdown is overkill — a pair of inline links costs less ink, less
// JS, and one fewer interaction.

"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const labels: Record<Locale, { code: string; full: string }> = {
  ka: { code: "KA", full: "ქართული" },
  en: { code: "EN", full: "English" },
};

const ariaLabelKeyForTarget: Record<Locale, "switchToGeorgian" | "switchToEnglish"> = {
  ka: "switchToGeorgian",
  en: "switchToEnglish",
};

type Variant =
  /** Compact two-letter chips. Used in header and footer. */
  | "inline"
  /** Larger, two-row labels for the mobile drawer. */
  | "drawer";

type Props = {
  variant?: Variant;
  /** When true the active link is rendered as `<span aria-current="true">`
      instead of a clickable Link. Defaults to true — clicking the
      current locale would no-op anyway and rendering a span makes the
      intent clearer to assistive tech. */
  collapseActive?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Class applied to each anchor (active and inactive). Lets callers
      invert colours when rendered over a dark hero. */
  itemClassName?: string;
};

export function LanguageSwitcher({
  variant = "inline",
  collapseActive = true,
  className,
  itemClassName,
}: Props) {
  const pathname = usePathname();
  const activeLocale = useLocale() as Locale;
  const t = useTranslations("nav");

  const isInline = variant === "inline";

  return (
    <div
      role="group"
      aria-label={t("currentLanguage")}
      className={cn(
        isInline
          ? "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em]"
          : "flex w-full items-center gap-2 text-sm font-medium uppercase tracking-[0.12em]",
        className
      )}
    >
      {routing.locales.map((loc, i) => {
        const isActive = loc === activeLocale;
        const labelText = isInline ? labels[loc].code : labels[loc].full;

        // Each non-active button gets a per-target aria label
        // ("Switch to Georgian"). The active one gets aria-current.
        const ariaLabel = !isActive ? t(ariaLabelKeyForTarget[loc]) : undefined;

        const baseClass = cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isActive
            ? "border-b-2 border-accent text-foreground"
            : "border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30",
          itemClassName
        );

        if (isActive && collapseActive) {
          return (
            <span
              key={loc}
              aria-current="true"
              lang={loc}
              className={cn(baseClass, "font-semibold")}
            >
              {labelText}
            </span>
          );
        }

        return (
          <span key={loc} className="contents">
            {/* Subtle visual divider between the two codes — only for
                the inline variant on the header/footer. */}
            {isInline && i > 0 ? (
              <span aria-hidden="true" className="text-muted-foreground/40">
                /
              </span>
            ) : null}
            <Link
              href={pathname}
              locale={loc}
              aria-label={ariaLabel}
              aria-current={isActive ? "true" : undefined}
              lang={loc}
              className={cn(baseClass, isActive && "font-semibold")}
              prefetch={false}
            >
              {labelText}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
