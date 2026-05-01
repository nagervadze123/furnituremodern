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

If neither Supabase variable is set, every page falls back to the in-memory catalogue — useful for offline development and previews.

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

- `categories`, `products`, `product_images`, `admin_users`, `redirects` tables.
- Row Level Security on every table. Public reads on published rows; writes only by users that resolve through `private.is_admin()`.
- An `is_admin()` SECURITY DEFINER helper in a dedicated `private` schema. Keeping it out of `public` means it cannot be called via the Data API (`supabase.rpc(...)`), only invoked indirectly by RLS evaluation.
- A `product-images` Storage bucket with INSERT + SELECT + UPDATE + DELETE policies for admins (upsert needs all three on the storage.objects table).

Do **not** add `private` to your project's "Exposed schemas" list in Project Settings → API. The schema is intentionally hidden from PostgREST.

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

## 12. Known notes

- `npm audit` reports a moderate PostCSS vulnerability inside Next.js's bundled deps. The auto-fix downgrades Next; this is upstream and will resolve on the next Next.js patch.
- `next.config.ts` CSP includes `script-src 'unsafe-inline'` because Next's hydration runtime needs it. Tighten with a nonce-based CSP later if you need stricter posture.
