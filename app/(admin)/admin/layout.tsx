// Admin layout. Lives in a route group `(admin)` that is OUTSIDE the
// [locale] tree — admin URLs are always `/admin/...` with no locale
// prefix. The route group itself is invisible in the URL.
//
// This is a true root layout (provides <html>/<body>) — none of the
// marketing chrome from app/[locale]/layout.tsx applies here. Sub-
// layouts decide whether to render the admin shell:
//
//   • /admin/login         → no shell, no auth check (public form)
//   • everything else      → AdminShell + requireAdmin() gate
//                            (see app/(admin)/admin/(dashboard)/layout.tsx)

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../../globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false, nocache: true },
};

// Admin pages must always reflect live data, never be cached.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-muted/30 font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
