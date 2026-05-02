# Furnituremodern

A high-end furniture catalogue website. Production-grade from day one: bilingual (Georgian + English), SEO + AEO ready, security-hardened, and editable through an admin panel backed by Supabase.

Built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui, next-intl, and Supabase.

---

## 1. Prerequisites

- **Node.js 20+** (built and tested on Node 22)
- **npm** (ships with Node)
- A **Supabase project** if you want a database-backed catalogue and admin panel. Without it, the site happily runs against a local TS fallback (see `content/`).

```bash
node --version
npm --version
```

## 2. Install

```bash
cd furnituremodern
npm install
```

## 3. Run locally

```bash
npm run dev      # localhost:3000
npm run build    # production build
npm start        # serve the built site
npm run lint     # ESLint
```

Open **http://localhost:3000** — you'll be redirected to `/ka`. English: **http://localhost:3000/en**. Admin: **http://localhost:3000/admin**.

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in what you need.

| Variable                         | Required?       | Purpose |
| -------------------------------- | --------------- | ------- |
| `NEXT_PUBLIC_SITE_URL`           | Recommended     | Used by sitemap, robots.txt, canonical URLs, JSON-LD. Defaults to `http://localhost:3000`. **Set in production.** |
| `NEXT_PUBLIC_SUPABASE_URL`       | For DB mode     | Supabase project URL. When set together with the anon key, the app reads catalogue data from Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | For DB mode     | Supabase publishable key. Safe to ship to the browser. |
| `SUPABASE_SERVICE_ROLE_KEY`      | Admin panel     | Server-only key used by the admin panel and seed scripts. **Never** prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN`   | Optional        | When set, the analytics placeholder script is loaded after the user accepts cookies. When empty, nothing is loaded and no cookies are written. |
| `REVALIDATE_WEBHOOK_URL`         | Multi-deploy    | Peer deployment's `/api/revalidate` endpoint. When set, every admin write POSTs here so the peer's ISR cache invalidates too. Leave unset for single-deployment setups. |
| `REVALIDATE_SECRET`              | Multi-deploy    | Shared secret for the webhook. Generate with `openssl rand -hex 32`. The **same** value must be set on every peer. Required if `REVALIDATE_WEBHOOK_URL` is set. |

If neither Supabase variable is set, every page falls back to the in-memory catalogue — useful for offline development and previews.

### Cross-deployment revalidation

If you run more than one deployment of this app against the same Supabase project (for example: localhost during development plus Vercel in production), set `REVALIDATE_WEBHOOK_URL` and `REVALIDATE_SECRET` on **both** peers so their ISR caches stay in sync. After an admin write, each peer revalidates its own paths *and* fires a fire-and-forget POST to the other peer's `/api/revalidate`. Without this wiring, edits made on one deployment will not appear on the other until the next natural revalidation tick.

## 5. Supabase setup

The first time you wire up Supabase:

1. Create a Supabase project. Copy `Project URL`, `anon` key, and `service_role` key into `.env.local`.
2. Run the schema:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/schema.sql
   ```
   (or paste it into the SQL editor in the dashboard.)
3. Seed sample products:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
4. Create a Supabase Auth user (Dashboard → Authentication → Users → Add user). Then promote that user to admin:
   ```sql
   insert into admin_users (user_id, role) values ('<USER_UUID>', 'admin');
   ```
5. Sign in at `/admin/login` with the email + password you created.

The schema sets up:

- `categories`, `products`, `product_images`, `admin_users`, `redirects`, `product_slug_history`, `not_found_log` tables.
- Row Level Security on every table. Public reads on published rows; writes only by users that resolve through `private.is_admin()`.
- An `is_admin()` SECURITY DEFINER helper in a dedicated `private` schema. Keeping it out of `public` means it cannot be called via the Data API (`supabase.rpc(...)`), only invoked indirectly by RLS evaluation.
- A `product-images` Storage bucket with INSERT + SELECT + UPDATE + DELETE policies for admins (upsert needs all three on the storage.objects table).

Do **not** add `private` to your project's "Exposed schemas" list in Project Settings → API. The schema is intentionally hidden from PostgREST.

### Updating an existing database

`supabase/schema.sql` is **destructive** — the `DROP TABLE … CASCADE` block at the top wipes existing rows. Only run it on a fresh project.

For databases that already hold data, apply the dated files in `supabase/migrations/` instead. Each statement is wrapped with `IF EXISTS` / `IF NOT EXISTS` so re-running is safe:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/2026-05-02-slug-system.sql
```

A fresh `schema.sql` already includes every migration up through its date — there is no need to layer the migrations on top.

## 6. Admin panel

The admin panel lives at `/admin` (route group `app/(admin)/`, intentionally outside the `[locale]` tree so it has its own root layout and chrome).

| Path | What it does |
| ---- | ------------ |
| `/admin/login`       | Email + password sign-in (Supabase Auth). |
| `/admin`             | Dashboard with quick links and counts. |
| `/admin/products`    | List with search, filter by category, paginated (25/page). Edit, delete, publish toggle. |
| `/admin/products/new`| Create form. Slug auto-suggested from `name_en`, manually overridable. |
| `/admin/products/[id]/edit` | Edit form. Renaming the slug auto-inserts ka + en redirect rows so old URLs keep working. Image upload to Supabase Storage. |
| `/admin/categories`  | Inline CRUD for the three categories. |
| `/admin/redirects`   | Manage `from_path` → `to_path` redirects manually. |

The admin layout shows a "Configure Supabase" notice if env vars are missing, instead of crashing.

Authentication and authorization happen in two layers:

1. `proxy.ts` blocks every `/admin/*` request that isn't `/admin/login` unless the visitor has a valid Supabase session AND a row in `admin_users`. Failures redirect to `/admin/login` with `?next=` preserved.
2. Every Server Action calls `requireAdmin()` (`lib/admin/auth.ts`) before touching the database. JWT validation uses `auth.getUser()` (server round-trip), never the cookie alone.

Inputs are validated with Zod (`lib/admin/schemas.ts`). The forms render Zod field errors via `useActionState`.

## 7. Project structure

```
furnituremodern/
├── app/
│   ├── layout.tsx                     Root layout (<html>, <body>, fonts, metadataBase)
│   ├── globals.css                    Tailwind + design tokens
│   ├── opengraph-image.tsx            Default 1200×630 OG image
│   ├── robots.ts                      /robots.txt (Disallows /admin)
│   ├── sitemap.ts                     /sitemap.xml (excludes /admin)
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx             Admin root layout
│   │       ├── login/page.tsx
│   │       └── (dashboard)/           Auth-gated section
│   │           ├── layout.tsx
│   │           ├── page.tsx           Dashboard
│   │           ├── products/          List + new + edit + actions
│   │           ├── categories/
│   │           └── redirects/
│   └── [locale]/
│       ├── layout.tsx                 Locale wrapper (next-intl + Header/Footer + consent)
│       ├── not-found.tsx
│       ├── page.tsx                   Home
│       ├── [category]/
│       │   ├── page.tsx               Dynamic category landing
│       │   └── [slug]/
│       │       ├── page.tsx           Product detail (ISR, revalidate=300)
│       │       └── opengraph-image.tsx Per-product OG image
│
├── components/
│   ├── admin/                         Admin-only client components (forms, editors, ...)
│   ├── layout/                        Header, Footer, DesktopNav, MobileNav, ...
│   ├── sections/                      Hero, FeaturedCategories, ProductCard, ...
│   ├── ui/                            shadcn/ui primitives (base-nova style, base-ui)
│   ├── analytics.tsx                  Loads analytics ONLY after cookie consent
│   ├── cookie-consent.tsx             First-party consent banner (localStorage)
│   └── json-ld.tsx
│
├── content/                           Local TS fallback (used when Supabase is unset)
│   ├── products.ts
│   ├── faq.ts
│   └── category-intros.ts
│
├── i18n/
│   ├── routing.ts
│   ├── navigation.ts
│   └── request.ts
│
├── lib/
│   ├── admin/
│   │   ├── auth.ts                    requireAdmin(), getAuthenticatedAdmin()
│   │   └── schemas.ts                 Zod schemas for every form
│   ├── data/
│   │   ├── products.ts                Supabase-first, local fallback
│   │   ├── categories.ts
│   │   └── types.ts
│   ├── supabase/
│   │   ├── env.ts                     Env reader + isSupabaseConfigured()
│   │   ├── client.ts                  Browser client
│   │   ├── server.ts                  Server (RSC/Action/Route Handler) client
│   │   ├── admin.ts                   Service-role client (server-only)
│   │   └── database.types.ts          Hand-written Database types
│   ├── navigation.ts                  mainNav source of truth (NavItem[] with children)
│   ├── site-config.ts                 Brand, contact, social, locales
│   ├── schema.ts                      JSON-LD generators
│   ├── seo.ts                         generateMetadata helper
│   ├── format.ts                      formatPrice() with Intl.NumberFormat
│   ├── slug.ts                        slugify() + isValidSlug()
│   └── utils.ts                       cn()
│
├── messages/                          UI strings: ka.json, en.json
├── public/llms.txt                    AEO description for LLM answer engines
├── supabase/
│   ├── schema.sql                     Tables, RLS, is_admin(), Storage bucket
│   └── seed.sql                       Sample categories + products
├── next.config.ts                     Security headers + image whitelist
├── proxy.ts                           Redirects → admin gate → next-intl
└── .env.example
```

## 8. Common tasks

### Edit business info (name, address, phone, social links)

→ `lib/site-config.ts`

Every page reads from this file: header, footer, JSON-LD, sitemap, OG image.

### Add or edit products

**With Supabase:** use `/admin/products`. Create/edit/delete from the browser. Slug renames automatically generate redirect rows so SEO doesn't break.

**Without Supabase:** edit `content/products.ts`. Each product is a typed object with bilingual `name` and `description`.

### Edit FAQ entries

→ `content/faq.ts` — drives the home accordion AND the `FAQPage` JSON-LD.

### Add a new top-level nav item

Edit `lib/navigation.ts`. Both desktop and mobile nav read from `mainNav`. The footer's "Explore" column reads from `footerExploreNav` (everything except home). Items can have `children: NavItem[]` for one-level dropdowns.

### Add a new locale (e.g. Russian)

1. In `i18n/routing.ts`, add `"ru"` to `locales`.
2. Create `messages/ru.json`.
3. Add a `ru` block to every entry in `lib/site-config.ts` `categories` and every bilingual field in `content/*.ts`.
4. Update the `Locale` mapping in `lib/seo.ts`.
5. If using Supabase, add `name_ru` / `description_ru` columns and update `lib/data/products.ts` / `lib/data/categories.ts` mappers.

### Replace placeholder images

`content/products.ts` uses `picsum.photos` for fallback data. Replace with real URLs and add the host to `images.remotePatterns` in `next.config.ts`.

## 9. URL safety: redirects

Slug changes happen — but old URLs must keep working. Every product slug change automatically inserts two rows into the `redirects` table (one for each locale). On every request, `proxy.ts` looks up the path in `redirects` and 301s to `to_path` if a match is found.

You can also add manual redirects from `/admin/redirects`.

## 10. Cookie consent + analytics

`components/cookie-consent.tsx` shows a small banner on the first visit. The user's choice (accepted / declined) lives in `localStorage` and emits a `fm-consent-change` window event.

`components/analytics.tsx` listens for that event and renders a `<Script>` tag **only** when both:
- `NEXT_PUBLIC_ANALYTICS_DOMAIN` is set, AND
- the user has accepted.

It currently emits a `console.debug` line as a placeholder — swap in your real analytics provider's snippet (Plausible, Fathom, Umami, etc.).

## 11. Production deployment

1. Set `NEXT_PUBLIC_SITE_URL` (no trailing slash). Without it, canonical URLs and OG images point at `localhost:3000`.
2. Set Supabase env vars if you want the live catalogue + admin panel. Otherwise the build falls back to local TS data.
3. `npm run build` should report zero errors and zero warnings.
4. The site is mostly static (categories + products are SSG with ISR). Admin routes are dynamic. Any Node host (Vercel, Netlify, Render, a VPS) works.

### Performance & bundle analysis

- `npm run analyze` runs a webpack production build with `@next/bundle-analyzer` enabled (`ANALYZE=true`). Results land in `.next/analyze/{client,nodejs,edge}.html` — open the client report to spot oversized dependencies. The script uses `--webpack` because the analyzer is webpack-only at Next 16.2.4.
- For a Turbopack-native size view, run `npx next experimental-analyze` (interactive UI on `localhost:4000`) after a regular build. Output-only mode: `npx next experimental-analyze -o`.
- **Per-route JS budget (target):** 180 KB First Load JS on public routes, ratcheted at *current baseline + 5%* once the analyzer pipeline reports per-route numbers natively. Until Next 16's build summary prints those again, treat 180 KB as a rough Lighthouse-derived ceiling rather than a CI gate.
- **Lighthouse mobile targets** (run against a production build):
  - Now (placeholder photos via `picsum.photos`): Performance ≥ 90, SEO 100, Accessibility ≥ 95, Best Practices 100.
  - After real product photos land: Performance ≥ 95.
- **INP target:** p75 < 200 ms (Core Web Vitals "Good" threshold). Verify after the RUM dashboard from Plan 3 ships and a week of real traffic accumulates.
- **View Transitions** are enabled via `experimental.viewTransition: true` in `next.config.ts` and a `<ViewTransition>` wrapper around `<main>` in `app/[locale]/layout.tsx`. Browsers without the View Transitions API fall back silently. `prefers-reduced-motion` collapses transition durations to zero in `app/globals.css` — content swaps instantly, matching the default non-VT behavior.
- **Resource hints are consent-gated.** The Supabase preconnect in the root layout fires only when `NEXT_PUBLIC_SUPABASE_URL` is configured. Analytics preconnects (Google Tag Manager, Facebook, Plausible) live inside `components/analytics-loader.tsx` and only emit *after* the visitor accepts the cookie banner — there is no analytics network warm-up before consent.

### Real User Monitoring (RUM)

Real-world Core Web Vitals are captured client-side by `components/web-vitals-reporter.tsx`, which wraps Next 16's `useReportWebVitals` hook (built on top of the `web-vitals` library). Every page reports up to five metrics — LCP, INP, CLS, FCP, TTFB — exactly once per page lifetime. The library handles the timing semantics: INP and CLS report on `visibilitychange → "hidden"` / `pagehide` with the final accumulated value; LCP / FCP / TTFB report at their natural settling moments.

Each metric fires two beacons:

1. **First-party RUM beacon** to `/api/vitals` (this app's own endpoint, route handler in `app/api/vitals/route.ts`). Anonymous, runs **without analytics consent** because the row stores no PII — just metric name, value, rating, pathname, optional locale + navigation_type + effective_connection_type, and a 3-bucket `device_type` derived server-side from the User-Agent before discarding the raw header. No IP, no cookies, no session id.
2. **Third-party analytics event** via `track({ type: "web_vitals", ... })`. Fans out to GA4 / GTM / Plausible only **after** the visitor accepts the cookie banner. Meta is intentionally a no-op for this event.

Both beacons use `navigator.sendBeacon()` with a `fetch({ keepalive: true })` fallback so reports survive the unload window without blocking navigation.

Hardening on the route handler:
- `POST` only, `dynamic = "force-dynamic"`, no caching.
- 4 KB payload cap (413 on overflow).
- Bot UAs return 204 silently — 403 would tip off scrapers.
- Per-IP rate limit: 60 req/min/IP (in-memory, best-effort across cold starts).
- Per-metric extreme-value drop: LCP/INP/FCP/TTFB > 60 s, CLS > 5 → silent 204.
- `Sec-GPC: 1` or `DNT: 1` → silent 204 (no row inserted).
- No-ops gracefully when Supabase env is missing — public pages never depend on RUM availability.

**Sampling.** Per-event sampling controlled by `NEXT_PUBLIC_RUM_SAMPLE_RATE` (default `1.0`, accepts 0–1). The decision happens client-side in the reporter so non-sampled events never hit the endpoint. Per-event sampling at low rates can leave low-traffic pages with no data; switch to session-based sampling when traffic exceeds ~100k events/day. See CHECKLIST `Scheduled maintenance`.

**Admin dashboard tile.** `/admin` shows a "Real User Performance (7d)" card with p75 LCP / INP / CLS, color-coded by Core Web Vitals thresholds (green ≤ good, amber = needs improvement, red > poor). Backed by the Postgres view `public.web_vitals_p75_7d` (idempotent definition in `supabase/schema.sql` and the `2026-05-02-web-vitals-extend` migration) which computes `PERCENTILE_CONT(0.75)` per metric over the rolling 7-day window. Empty state when zero rows: dashed values with the message *"Real user data appears after deployment receives live traffic."*

**Retention.** No automatic cleanup yet — Phase 4 will add scheduled jobs. For now, cap the table size manually with the snippet below (90 days is a reasonable starting retention window):

```sql
DELETE FROM public.web_vitals
WHERE occurred_at < now() - interval '90 days';
```

**Launch verification.** After deployment, visit the live site, refresh `/admin`, and confirm the RUM tile shows non-zero samples within 5 minutes.

**RUM vs Lighthouse.** RUM is the *real-world* signal — what users actually see on their hardware and networks. Lighthouse on preview deploys (Phase 4 DX work) is *synthetic* — fixed device, fixed network, repeatable. Both are useful: RUM for production reality, Lighthouse for catching regressions before merge.

## 12. Search engine setup

### Verification meta tags

Each search-engine console issues a verification token. Drop the token into the matching `NEXT_PUBLIC_*` env var and the corresponding `<meta>` tag appears in the root `<head>`. Missing vars render nothing — leave them empty if you don't use a console.

| Console | Env var | Output meta name |
| --- | --- | --- |
| Google Search Console | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | `google-site-verification` |
| Bing Webmaster Tools | `NEXT_PUBLIC_BING_SITE_VERIFICATION` | `msvalidate.01` |
| Yandex Webmaster | `NEXT_PUBLIC_YANDEX_VERIFICATION` | `yandex-verification` |
| Facebook Domain | `NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION` | `facebook-domain-verification` |

Re-deploy after setting a token; the meta tag is inlined at build time.

### Sitemap + robots

- `/robots.txt` — generated from `app/robots.ts`. Allows everything, disallows `/admin`, `/api/admin`, `/_next`, `/private`. References `/sitemap.xml` and sets `Crawl-delay: 1`.
- `/sitemap.xml` — generated from `app/sitemap.ts`. Single sitemap covering home, all categories, and every published, non-soft-deleted product in both locales with hreflang alternates and `x-default`. Cached for 1 hour; admin saves call `revalidatePath("/sitemap.xml")` so a fresh crawl always sees the latest URLs.

We deliberately stay on a single sitemap rather than a sitemap index — at current scale (3 categories × dozens of products × 2 locales) splitting adds revalidation surfaces without observable benefit. If product count crosses ~3,000 we revisit.

### IndexNow (optional)

[IndexNow](https://www.indexnow.org) accelerates re-crawls on Bing, Yandex, Naver, and Seznam after URL changes. Enable it by setting two server-only env vars:

```bash
# Generate once per host
INDEXNOW_KEY=$(openssl rand -hex 32)

# Optional — defaults to the host parsed from NEXT_PUBLIC_SITE_URL
INDEXNOW_HOST=furnituremodern.ge
```

When configured, admin server actions submit affected URLs to IndexNow on:

- product publish (new and updated rows)
- slug change — submits both old and new URLs
- category change — submits both old and new URLs
- soft delete with redirect — submits the old URL and the destination category
- soft delete with 410 Gone — submits the now-410 URL

All submissions are best-effort with a 5-second timeout and never block or fail an admin save. The key file is served from `/indexnow.txt` (gated on `INDEXNOW_KEY` being set; 404 otherwise) and the submission payload references it via `keyLocation` so the IndexNow protocol's ownership check resolves cleanly.

## 13. Known notes

- `npm audit` reports a moderate PostCSS vulnerability inside Next.js's bundled deps. The auto-fix downgrades Next; this is upstream and will resolve on the next Next.js patch.
- `next.config.ts` CSP includes `script-src 'unsafe-inline'` because Next's hydration runtime needs it. Tighten with a nonce-based CSP later if you need stricter posture.
