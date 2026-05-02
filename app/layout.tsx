// True root layout. Lives at the top of app/ so that special files
// outside [locale] — robots.ts, sitemap.ts, opengraph-image.tsx, and the
// synthesized /_not-found — all inherit `<html>`, `<body>`, and the
// site-wide metadata (including metadataBase, which is what stops the
// "metadataBase is not set" build warning from firing on /_not-found).
//
// Locale-specific concerns (fonts, lang attribute, providers) are
// handled by app/[locale]/layout.tsx.

import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import {
  absoluteUrl,
  siteConfig,
  verificationTokens,
} from "@/lib/site-config";

import "./globals.css";

// Search-engine verification tags. We only emit the ones whose env var
// is set; passing `undefined` to Next's metadata API drops the tag.
// Bing uses the `msvalidate.01` meta name; Facebook uses
// `facebook-domain-verification` — both go under `verification.other`.
function buildVerification(): Metadata["verification"] {
  const other: Record<string, string> = {};
  if (verificationTokens.bing) other["msvalidate.01"] = verificationTokens.bing;
  if (verificationTokens.facebook) {
    other["facebook-domain-verification"] = verificationTokens.facebook;
  }
  return {
    google: verificationTokens.google,
    yandex: verificationTokens.yandex,
    other: Object.keys(other).length > 0 ? other : undefined,
  };
}

// Fonts must be loaded at the root so they apply to every page in the
// tree, including /_not-found (which has no [locale] layout above it).
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Set once here so every page in the tree inherits it. Without this,
  // Next.js falls back to localhost when resolving opengraph-image
  // references during static generation and emits a build warning.
  metadataBase: new URL(absoluteUrl("/")),
  title: { default: siteConfig.name, template: `%s — ${siteConfig.name}` },
  // Default OG image — fully qualified URL so we never hit the
  // metadata-resolution warning around static metadata route files.
  openGraph: {
    siteName: siteConfig.name,
    images: [siteConfig.defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [siteConfig.defaultOgImage],
  },
  verification: buildVerification(),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The lang attribute is updated client-side by app/[locale]/layout.tsx
  // when navigating into a localized route. We use the default locale
  // here so HTML is never lang-less.
  return (
    <html
      lang={siteConfig.defaultLocale}
      // The two font CSS variables go on <html> so every descendant
      // inherits them. globals.css reads them via var(--font-display).
      className={`${fraunces.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
