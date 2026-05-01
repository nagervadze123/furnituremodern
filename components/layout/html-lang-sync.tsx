// Tiny utility component: keeps <html lang> in sync with the active locale.
//
// We need this because the root <html> tag lives in app/layout.tsx
// (which doesn't know the locale), while the active locale is decided
// inside app/[locale]/layout.tsx. Updating the lang attribute from the
// client lets accessibility tools (and search engines that run JS) pick
// up the correct language without rendering two competing <html> tags.

"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/routing";

type Props = { locale: Locale };

export function HtmlLangSync({ locale }: Props) {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Renders nothing; effect-only component.
  return null;
}
