# Plan 1 — CSP + Security Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `'unsafe-inline'` CSP with a per-request nonce-based strict CSP (production) and an `'unsafe-eval'`-permitting CSP (development), and add the missing security headers (COOP, CORP, updated Permissions-Policy) so production responses match what a 2026 senior engineering team would ship.

**Architecture:** Move CSP generation out of `next.config.ts` and into `proxy.ts` middleware so we can mint a fresh nonce per request via Web Crypto. Keep all other security headers (HSTS, X-Frame-Options, COOP, CORP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) in `next.config.ts` because they don't vary per request. Two new utility modules — `lib/security/nonce.ts` and `lib/security/csp.ts` — hold the pure logic so it's diff-readable and testable later.

**Tech Stack:** Next.js 16.2.4 (App Router), `proxy.ts` middleware running on the Edge runtime, Web Crypto API.

---

## Important Caveats (read before starting)

1. **Nonce-based CSP forces dynamic rendering on every page.** Per `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`: "Static optimization and Incremental Static Regeneration (ISR) are disabled… Partial Prerendering (PPR) is incompatible with nonce-based CSP." The user explicitly chose nonces in the Phase 3 spec; this plan implements that choice. The performance impact on this app is small because the site already uses `[locale]` dynamic segments and per-request Supabase reads, so most routes are dynamic anyway. If a static landing page is added later that should be statically rendered, the team will need to revisit this trade-off (e.g., the experimental `experimental.sri` SRI hash mode).
2. **Next.js auto-applies the nonce to its own scripts.** When middleware sets the `Content-Security-Policy` header on the *request* with a `'nonce-X'` token, Next.js parses it and stamps `nonce="X"` on every framework script during SSR. We only need to plumb the nonce manually into our own inline scripts — `JsonLd` and `Analytics`.
3. **Style-src stays `'self' 'unsafe-inline'` in production.** The Phase 3 spec only prohibits `'unsafe-inline'` and `'unsafe-eval'` on `script-src`. Styles are far less weaponizable, Tailwind v4 emits a static stylesheet, and tightening style-src to nonce-only risks intermittent breakage from framework-injected styles.
4. **No unit-test framework added in this plan.** Pragmatic TDD: the CSP/nonce logic is small, and the only honest way to verify it is end-to-end (curl the response headers, inspect view-source). Plan 2 (slug system) will add Vitest because transliteration genuinely needs unit tests.
5. **Autopush is on.** Per `AGENTS.md`, every committed task is pushed to `origin/main` immediately and Vercel deploys. Each task ends with a commit + push step.

---

## File Structure

| Path | Action | Responsibility |
|------|--------|----------------|
| `lib/security/nonce.ts` | Create | `generateNonce()` — 16 random bytes, base64-encoded, via Web Crypto |
| `lib/security/csp.ts` | Create | `buildCsp({ nonce, isDev, supabaseOrigin })` — returns the production or development CSP string |
| `proxy.ts` | Modify | Generate nonce per request; set CSP on request + response; pass `x-nonce` header. Skip CSP work for prefetch and asset paths the matcher doesn't already exclude. |
| `next.config.ts` | Modify | Drop the static CSP entry. Update `Permissions-Policy`. Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`. Keep HSTS/X-Frame-Options/Referrer-Policy/X-Content-Type-Options. Each header gets a code-comment explaining why it exists. |
| `components/json-ld.tsx` | Modify | Accept optional `nonce?: string` prop; emit it as the `<script>` `nonce` attribute. |
| `components/analytics.tsx` | Modify | Accept `nonce?: string` prop; pass to `next/script`. |
| `app/[locale]/layout.tsx` | Modify | Become async; read `x-nonce` via `headers()`; pass to `<JsonLd>` and `<Analytics>`. |
| `app/layout.tsx` | No change required | Currently renders no inline scripts of its own; Next.js will auto-nonce framework scripts. |

---

## Task 1: Create the nonce utility

**Files:**
- Create: `lib/security/nonce.ts`

- [ ] **Step 1: Write `lib/security/nonce.ts`**

```ts
// lib/security/nonce.ts
//
// Per-request CSP nonce generator. Runs in the Edge runtime (proxy.ts).
//
// Why 16 bytes?
//   The W3C CSP spec recommends "at least 128 bits of entropy" for nonces.
//   16 bytes = 128 bits, base64-encoded that's 24 URL-safe characters.
//
// Why crypto.getRandomValues(Uint8Array) and not crypto.randomUUID()?
//   Both are cryptographically secure. getRandomValues is the explicit
//   "Web Crypto API" call the Phase 3 spec asks for, and it produces a
//   shorter token that's easier to grep for in browser dev tools.

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa expects a binary string. String.fromCharCode on a 16-byte array
  // is fine — no surrogate-pair concerns at this size.
  return btoa(String.fromCharCode(...bytes));
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/security/nonce.ts
git commit -m "Add Web Crypto nonce helper for per-request CSP"
git push origin main
```

---

## Task 2: Create the CSP string builder

**Files:**
- Create: `lib/security/csp.ts`

- [ ] **Step 1: Write `lib/security/csp.ts`**

```ts
// lib/security/csp.ts
//
// Builds the Content-Security-Policy header string used by proxy.ts.
//
// Two modes:
//   - Development: includes 'unsafe-eval' on script-src because React's
//     dev runtime evaluates strings at runtime to reconstruct server-side
//     error stacks. Without this, the dev console fills with CSP errors
//     about the eval directive being violated.
//   - Production: nonce-based strict-dynamic. No 'unsafe-eval', no
//     'unsafe-inline' on script-src. Inline scripts must carry the
//     matching nonce attribute or they're blocked.
//
// connect-src is computed from the configured Supabase origin so the
// browser client can hit auth/REST/Realtime; we add the wss:// peer for
// Realtime websockets.

type BuildCspArgs = {
  nonce: string;
  isDev: boolean;
  supabaseOrigin: string; // empty string when Supabase isn't configured
};

export function buildCsp({ nonce, isDev, supabaseOrigin }: BuildCspArgs): string {
  const connectSrc = ["'self'"];
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin.replace(/^https:/, "wss:"));
  }

  // 'strict-dynamic' lets framework-loaded scripts load their own
  // dependencies without requiring every CDN host to be allow-listed.
  // Required because Next.js's runtime loader chains additional bundles.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  // Style-src stays 'unsafe-inline' even in production: Tailwind v4 emits
  // a static stylesheet but Next.js framework code occasionally injects
  // small inline styles that aren't worth the breakage risk to nonce.
  const styleSrc = "'self' 'unsafe-inline'";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add lib/security/csp.ts
git commit -m "Add CSP string builder with dev/prod branching"
git push origin main
```

---

## Task 3: Wire nonce + CSP through proxy.ts

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Add the imports at the top of `proxy.ts`** (after the existing imports)

Find this block:
```ts
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
```

Add immediately after:
```ts
import { generateNonce } from "./lib/security/nonce";
import { buildCsp } from "./lib/security/csp";

// Computed once per cold start. The Supabase URL doesn't change at
// runtime, so we can cache the origin we'll plug into connect-src.
const SUPABASE_ORIGIN = SUPABASE_URL ? new URL(SUPABASE_URL).origin : "";
```

- [ ] **Step 2: Add a helper that decorates a response with CSP + nonce**

Insert this above the `proxy` default export (right after `checkAdminAuth`):

```ts
// ---------------------------------------------------------------------------
// 3. CSP + nonce
// ---------------------------------------------------------------------------
// Returns a fresh nonce, attaches the CSP header to both the request the
// page will see (so Next.js can extract the nonce and stamp its own
// scripts) and the response (so the browser enforces the policy).
//
// Why on the request as well as the response?
//   Next.js parses the request's Content-Security-Policy header to find
//   the nonce token and applies it automatically to framework scripts,
//   page bundles, and <Script> components. Without setting the request
//   header, framework scripts are unsigned and get blocked.
function applyCspToResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = generateNonce();
  const csp = buildCsp({ nonce, isDev, supabaseOrigin: SUPABASE_ORIGIN });

  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
```

- [ ] **Step 3: Apply the helper to every code path that returns a response**

Replace the existing `proxy` function body:

```ts
export default async function proxy(request: NextRequest) {
  // 1. Redirects (only for marketing routes — admin paths are handled below).
  const redirectResponse = await checkRedirect(request);
  if (redirectResponse) return redirectResponse; // 301s don't need CSP

  // 2. Admin auth.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminResponse = await checkAdminAuth(request);
    if (adminResponse) return applyCspToResponse(request, adminResponse);
    // /admin/login fallthrough — we still want CSP on the login page.
    return applyCspToResponse(request, NextResponse.next());
  }

  // 3. Locale routing for the marketing site.
  const intlResponse = intlMiddleware(request);
  return applyCspToResponse(request, intlResponse);
}
```

The redirects path skips CSP because a 301 has no body. The admin and marketing paths both apply CSP.

- [ ] **Step 4: Verify the proxy still typechecks**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Smoke check the dev server**

```bash
npm run dev &
DEV_PID=$!
sleep 6
curl -sI http://localhost:3000/ka | grep -iE 'content-security-policy|x-nonce' | head -5
kill $DEV_PID
```

Expected: response contains a `Content-Security-Policy` header that includes `'nonce-...'`, `'strict-dynamic'`, and `'unsafe-eval'` (because dev). The `x-nonce` header should NOT appear in the *response* (it's a request header) — only the CSP appears.

- [ ] **Step 6: Open the dev server in a browser**

Run `npm run dev`, browse to `http://localhost:3000/ka`, open the browser DevTools console.

Expected: zero `Content-Security-Policy` violation messages, especially nothing about runtime evaluation being blocked. The page renders normally, navigation works, locale switcher works.

- [ ] **Step 7: Commit**

```bash
git add proxy.ts
git commit -m "Generate per-request CSP nonce and attach in proxy"
git push origin main
```

---

## Task 4: Refresh static security headers in `next.config.ts`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace the `csp`/`connectSrc`/`securityHeaders` blocks**

Open `next.config.ts:17-71`. Delete the entire block from `const SUPABASE_URL = …` through the closing bracket of `securityHeaders`. Replace it with the following:

```ts
// Browser-side Supabase calls (auth, REST, Realtime) all hit the project
// origin. Read it once and reuse it for the next/image whitelist.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : "";

// Static security headers sent on every response. The Content-Security-
// Policy is intentionally NOT here — it's set per-request from proxy.ts
// because it carries a nonce that has to be unique per page render.
const securityHeaders = [
  // HSTS: force HTTPS for two years, include subdomains, signal preload list eligibility.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block MIME-type sniffing — stops a server-typed text/plain from being executed as JS.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No iframing this site, anywhere, ever (defense-in-depth alongside CSP frame-ancestors).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin (not the full URL) on cross-origin navigation.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features by default. interest-cohort=() opts out of FLoC.
  // geolocation=(self) is permissive enough for delivery-zone features inside our origin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // COOP isolates this top-level browsing context — required to be a cross-origin-isolated
  // page and protects against side-channel leaks via window.opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // CORP restricts which origins can embed our resources. Same-origin pairs well with COOP.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];
```

- [ ] **Step 2: Confirm `nextConfig.headers()` still uses `securityHeaders`**

The existing `async headers()` function in `next.config.ts` should remain unchanged — it already does:

```ts
async headers() {
  return [{ source: "/:path*", headers: securityHeaders }];
},
```

No edit needed here, but read it once to confirm it still references `securityHeaders` (the variable name didn't change).

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Smoke check headers in dev**

```bash
npm run dev &
DEV_PID=$!
sleep 6
curl -sI http://localhost:3000/ka | grep -iE 'cross-origin|permissions-policy|strict-transport|x-frame|referrer-policy|content-type-options' | sort
kill $DEV_PID
```

Expected output (order may vary):
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

If any header is missing, fix it before moving on.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts
git commit -m "Add COOP/CORP, refresh Permissions-Policy, drop static CSP"
git push origin main
```

---

## Task 5: Plumb the nonce into JsonLd and Analytics

**Files:**
- Modify: `components/json-ld.tsx`
- Modify: `components/analytics.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Update `components/json-ld.tsx`**

Add an optional `nonce?: string` field to the `Props` type, then forward it to the `<script>` element via the `nonce` attribute. The existing `dangerouslySetInnerHTML` payload stays unchanged — we control the input (typed object passed from server code) and JSON-LD requires raw JSON rather than HTML-encoded text. The full updated file:

```tsx
type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
  // Optional id, useful when you want to target a script tag from tests.
  id?: string;
  // Per-request CSP nonce. Required when strict CSP is active in
  // production; passed through from the layout that already read it
  // from the x-nonce request header.
  nonce?: string;
};

export function JsonLd({ data, id, nonce }: Props) {
  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 2: Update `components/analytics.tsx`**

Add the same optional `nonce?: string` prop and forward it to `next/script`. Full updated file:

```tsx
"use client";

import Script from "next/script";
import { useConsent } from "./cookie-consent";

const ANALYTICS_DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

type AnalyticsProps = {
  // Per-request CSP nonce, threaded down from the locale layout.
  nonce?: string;
};

export function Analytics({ nonce }: AnalyticsProps) {
  const consent = useConsent();
  if (!ANALYTICS_DOMAIN || consent !== "accepted") return null;

  return (
    <Script
      id="fm-analytics"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `console.debug("[analytics] consented; domain=${ANALYTICS_DOMAIN}");`,
      }}
    />
  );
}
```

- [ ] **Step 3: Update `app/[locale]/layout.tsx`**

The layout is currently `async function LocaleLayout({ children, params })` — already async, so we just need to read headers and pass the nonce through.

Add this import alongside the other Next imports:
```ts
import { headers } from "next/headers";
```

Inside `LocaleLayout`, immediately after `setRequestLocale(locale);`, add:

```ts
  // Read the per-request nonce that proxy.ts injected. Passed into
  // every component that emits an inline script tag so the strict
  // production CSP doesn't block them.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
```

Update the JSX so JsonLd and Analytics receive the nonce:

```tsx
      {/* Site-wide JSON-LD: Organization + WebSite. */}
      <JsonLd id="ld-organization" data={organizationJsonLd()} nonce={nonce} />
      <JsonLd id="ld-website" data={websiteJsonLd(locale)} nonce={nonce} />

      <NextIntlClientProvider>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <CookieConsent />
        <Analytics nonce={nonce} />
      </NextIntlClientProvider>
```

(`HtmlLangSync` doesn't render an inline script tag — it manipulates `document.documentElement.lang` from a client effect, so no nonce needed there.)

- [ ] **Step 4: Search for other JsonLd callers**

```bash
grep -rn "JsonLd\b" app components --include="*.tsx" --include="*.ts" | grep -v "json-ld.tsx" | grep -v "//"
```

If any usage exists outside `app/[locale]/layout.tsx` (e.g., on a product page rendering Product schema), update those callers to also accept the nonce. For each match, the parent must already be a Server Component — read `headers()` there and pass `nonce` to `<JsonLd>`. If the file is a Client Component, push the nonce read into the nearest server-rendered ancestor and pass it down as a prop.

Document the count of files touched as you go so the commit message is accurate.

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add components/json-ld.tsx components/analytics.tsx app/[locale]/layout.tsx
git commit -m "Pass per-request nonce into JsonLd and Analytics"
git push origin main
```

---

## Task 6: Verify production build under strict CSP

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: completes with 0 errors, 0 warnings. If a `useDynamicAPIs`/`headers()`-related warning appears about a route that should be static, leave it for now — Plan 1 doesn't aim to make any route static, and the caveat at the top of this plan calls out that nonce-CSP forces dynamic rendering across the board.

- [ ] **Step 2: Start the production server**

```bash
npm start &
PROD_PID=$!
sleep 6
```

- [ ] **Step 3: Inspect CSP and the rest of the headers**

```bash
curl -sI http://localhost:3000/ka | grep -iE 'content-security-policy|cross-origin|permissions-policy|strict-transport|x-frame|referrer-policy|content-type-options' | sort
```

Expected:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-XXXXXXXXXXXXXXXXXXXXXXX=' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; …`
  - The nonce token is a 24-char base64 string (exact length depends on padding).
  - **No** `'unsafe-eval'`.
  - **No** `'unsafe-inline'` on `script-src`.
- All seven static headers from Task 4 still present.

- [ ] **Step 4: Confirm the nonce flows into rendered HTML**

```bash
curl -s http://localhost:3000/ka | grep -oE 'nonce="[^"]+"' | sort -u | head -5
```

Expected: at least one `nonce="..."` attribute is present, and every nonce string in the page matches the `'nonce-…'` token from the CSP header in step 3 (they should all be identical for a given request).

- [ ] **Step 5: Confirm no inline script lacks a nonce**

```bash
curl -s http://localhost:3000/ka > /tmp/page.html
grep -oE '<script[^>]*>' /tmp/page.html | grep -v 'nonce=' | grep -v 'src=' | head -5
```

Expected: empty output. (External `<script src="...">` tags without nonces are fine because `'strict-dynamic'` lets them load via the nonced loader; only inline `<script>...</script>` tags without nonces would be a problem.)

- [ ] **Step 6: Spot-check one product detail page**

```bash
# Pick any published product slug from your local DB — substitute below.
curl -sI http://localhost:3000/ka/sofa/some-product-slug | grep -i content-security-policy
```

Expected: same shape as step 3, but with a *different* nonce — proving the nonce is freshly minted per request.

- [ ] **Step 7: Open the production server in a real browser**

Browse to `http://localhost:3000/ka`. Open DevTools Console.
Expected: zero CSP violation messages. Page renders normally. Navigate to a product, navigate back — both pages render without CSP errors.

- [ ] **Step 8: Stop the production server**

```bash
kill $PROD_PID
```

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: 0 issues.

- [ ] **Step 10: Final commit (only if any verification surfaced fixes)**

If steps 1–9 all passed without any code edits, no commit is needed for this task — the previous commits already shipped the change. If any edit was needed to make a step pass, commit it now:

```bash
git add -A
git commit -m "Fix CSP regression caught in verification"
git push origin main
```

---

## Verification Gate (Plan 1 done when all of these pass)

- [ ] `npm run lint` → 0 issues.
- [ ] `npm run build` → 0 errors, 0 warnings.
- [ ] Dev server (`npm run dev`) renders `/ka` with no CSP runtime-evaluation errors in the browser console.
- [ ] Dev response includes `Content-Security-Policy` with `'unsafe-eval'` AND `'nonce-...'`.
- [ ] Production server (`npm start`) response on `/ka` includes `Content-Security-Policy` with `'nonce-...'` and `'strict-dynamic'` and **without** `'unsafe-eval'` or `'unsafe-inline'` on `script-src`.
- [ ] Two consecutive `curl -sI` calls to the same URL return *different* nonce values.
- [ ] Production response on `/ka` includes all seven static security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (with `interest-cohort=()`, `geolocation=(self)`), Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy.
- [ ] View-source on the production HTML shows every inline `<script>` tag carrying a `nonce="..."` attribute, and the value matches the CSP header for that response.
- [ ] No browser-console CSP violations on the production server when browsing `/ka`, `/en`, and one product detail page.

When the gate passes, Plan 1 is complete and ready for Plan 2 (Slug System Production-Grade).
