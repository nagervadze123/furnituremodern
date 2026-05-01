// Edge proxy. Runs on every request before the page is rendered.
//
// Three responsibilities, in order:
//   1. Redirects table lookup: if the requested path matches a row in
//      `redirects`, return a 301 to `to_path` immediately. This keeps
//      old URLs alive after a slug change with zero SEO loss.
//   2. Admin gate: anything under /admin (except /admin/login) requires
//      an authenticated user with a row in `admin_users`. Otherwise
//      redirect to /admin/login.
//   3. Locale routing: hand off to next-intl for the marketing site,
//      which adds /ka or /en prefixes when missing and validates the
//      locale segment.
//
// Network access from this file uses @supabase/ssr's edge-friendly
// `createServerClient` so it works in the proxy runtime.

import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "./lib/supabase/env";
import type { Database } from "./lib/supabase/database.types";

const intlMiddleware = createIntlMiddleware(routing);

// ---------------------------------------------------------------------------
// 1. Redirects table lookup
// ---------------------------------------------------------------------------
// We avoid hammering the DB on every request by skipping the lookup
// for paths that obviously aren't user-facing (admin, _next, etc.) and
// by short-circuiting when Supabase isn't configured.
async function checkRedirect(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!isSupabaseConfigured()) return null;

  const { pathname } = request.nextUrl;
  // Don't query the DB for admin paths or static assets.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt"
  ) {
    return null;
  }

  // Anonymous client — RLS allows public reads on `redirects`.
  // We construct a no-op cookie store because the proxy doesn't need
  // to read or write auth cookies for this lookup.
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {
          /* noop */
        },
      },
    }
  );

  // Compare against pathname only — query strings shouldn't break the
  // lookup. Editors are expected to write `from_path` without a query.
  const { data, error } = await supabase
    .from("redirects")
    .select("to_path, status_code")
    .eq("from_path", pathname)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Preserve the query string from the incoming URL.
  const url = request.nextUrl.clone();
  url.pathname = data.to_path;
  return NextResponse.redirect(url, { status: data.status_code });
}

// ---------------------------------------------------------------------------
// 2. Admin gate
// ---------------------------------------------------------------------------
async function checkAdminAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;
  // /admin/login is the unauthenticated landing page; let it through.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return null;
  }

  // If Supabase isn't configured, the dashboard layout shows a
  // configure-Supabase notice — let the request through so that page
  // renders rather than redirecting in a loop.
  if (!isSupabaseConfigured()) return null;

  // Build a response we can attach refreshed cookies to.
  const response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Refresh both the request the page will see AND the response
          // we send back so the new tokens are stored.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT against Supabase Auth (network call) —
  // never trust the cookie alone for authorization decisions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Confirm the user is in admin_users — JWT alone isn't enough.
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("error", "not-an-admin");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export default async function proxy(request: NextRequest) {
  // 1. Redirects (only for marketing routes — admin paths are handled below).
  const redirectResponse = await checkRedirect(request);
  if (redirectResponse) return redirectResponse;

  // 2. Admin auth.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminResponse = await checkAdminAuth(request);
    if (adminResponse) return adminResponse;
    // If checkAdminAuth returned null (e.g. /admin/login), fall through
    // and let the request go to its handler without locale routing.
    return NextResponse.next();
  }

  // 3. Locale routing for the marketing site.
  return intlMiddleware(request);
}

export const config = {
  // Match every URL except:
  //   - Next.js internals (_next, _vercel, api)
  //   - root metadata routes Next.js generates itself (sitemap, robots)
  //   - ANY path that ends in `opengraph-image` (per-product OG images
  //     live deep inside the locale tree and must reach Next directly)
  //   - any path containing a dot (real files like /favicon.ico, /llms.txt)
  matcher:
    "/((?!api|_next|_vercel|sitemap.xml|robots.txt|.*opengraph-image|.*\\..*).*)",
};
