// Renders a minimal 410 Gone page in the active locale. Reached only
// via a proxy.ts rewrite when a redirects row matches the requested
// path with status_code = 410. Plan 5 will replace this with a fully
// branded layout matching the rest of the site; for now we ship
// correct semantics with bare HTML.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COPY = {
  ka: {
    title: "გვერდი წაშლილია",
    body: "ეს პროდუქტი აღარ არის ხელმისაწვდომი. გადახედეთ ჩვენს კატალოგს.",
    cta: "კატეგორიები",
  },
  en: {
    title: "This page is gone",
    body: "This product is no longer available. Browse our catalogue.",
    cta: "Browse categories",
  },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const copy = locale === "ka" ? COPY.ka : COPY.en;

  const html = `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <title>${copy.title}</title>
    <meta name="robots" content="noindex" />
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem;">
    <h1>${copy.title}</h1>
    <p>${copy.body}</p>
    <p><a href="/${locale}">${copy.cta}</a></p>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
