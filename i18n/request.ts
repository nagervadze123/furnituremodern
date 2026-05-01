// Server-side configuration for next-intl. Loads the right translation
// file for the current request based on the locale segment in the URL.
// Referenced from next.config.ts via the next-intl plugin.

import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // The middleware sets a locale on every request; this reads it back.
  const requested = await requestLocale;

  // Defensive check: if someone hits /xx/ where xx is not a known locale,
  // fall back to the default rather than crashing.
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Dynamically import only the message file for the active locale so
    // unused translations are not shipped in every build.
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
