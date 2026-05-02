# Furnituremodern — launch checklist

A snapshot of what's already done versus what to do before you go live.

---

## Already done

### Project skeleton
- [x] Next.js 16 + TypeScript (strict mode) + Tailwind CSS v4
- [x] shadcn/ui (`base-nova` style) installed and styled
- [x] ESLint preconfigured (`npm run lint`)
- [x] App Router; server components by default
- [x] Folder structure: `app/[locale]/(public)`, `app/(admin)/admin/...`, `components/{layout,sections,ui,admin}`, `lib/{data,supabase,admin}`, `content/`, `i18n/`, `messages/`, `supabase/`

### Internationalization (next-intl 4)
- [x] Two locales wired: `ka` (default) and `en`
- [x] Every URL is locale-prefixed: `/ka/...`, `/en/...`
- [x] Locale switcher in the header keeps you on the same page
- [x] Locale-aware `<Link>` and `useRouter` from `i18n/navigation.ts`
- [x] `<HtmlLangSync />` keeps `<html lang>` correct on the client

### Public pages
- [x] **Home** — hero, featured categories, brand story, FAQ
- [x] **Category landing** (`/[locale]/[category]`) — dynamic route, intro, product grid, cross-links
- [x] **Product detail** (`/[locale]/[category]/[slug]`) — gallery, name, price, description, breadcrumbs, ISR (`revalidate = 300`)
- [x] Per-product OG images (`opengraph-image.tsx` under each `[slug]`)
- [x] Navigation includes Home + 3 categories from `lib/navigation.ts`

### Data layer & Supabase
- [x] `lib/data/products.ts`, `lib/data/categories.ts` — Supabase-first with local TS fallback
- [x] Three Supabase clients: browser (`client.ts`), server (`server.ts`), service-role (`admin.ts` with `import "server-only"`)
- [x] Hand-written `Database` types (`lib/supabase/database.types.ts`) so Insert/Update/Upsert don't infer as `never`
- [x] `supabase/schema.sql` — tables, RLS on **every** table, `is_admin()` SECURITY DEFINER, `product-images` Storage bucket, full upsert policies (INSERT + SELECT + UPDATE + DELETE)
- [x] `supabase/seed.sql` — 3 categories + 18 products
- [x] Build still works without Supabase env vars (offline fallback)

### Admin panel (`/admin`)
- [x] Separate route group `app/(admin)/admin/` with its own root layout
- [x] Login (`/admin/login`) using Supabase Auth (email + password)
- [x] Dashboard with counts and quick links
- [x] Products list — search, category filter, pagination (25/page), edit + delete
- [x] Product create/edit form — slug auto-suggest, manual override, image upload to Storage
- [x] Slug rename automatically inserts ka + en redirect rows
- [x] Categories CRUD
- [x] Redirects manual editor (`/admin/redirects`)
- [x] Auth/authorization in two layers:
  - `proxy.ts` blocks every `/admin/*` (except `/admin/login`) without a valid session AND `admin_users` row
  - Every Server Action calls `requireAdmin()` before touching the DB
- [x] JWT validated via `auth.getUser()` (server round-trip), never the cookie alone
- [x] Every input validated with Zod (`lib/admin/schemas.ts`); field errors surfaced via `useActionState`
- [x] "Configure Supabase" notice instead of crashing when env vars are missing

### URL safety
- [x] `redirects` table queried in `proxy.ts` BEFORE any other logic
- [x] Slug edits in admin upsert ka + en redirect rows automatically
- [x] `/admin/redirects` for manual entries

### Cookie consent + analytics
- [x] First-party banner (`components/cookie-consent.tsx`), localStorage, ka/en
- [x] `components/analytics.tsx` only loads when `NEXT_PUBLIC_ANALYTICS_DOMAIN` is set AND consent has been given
- [x] No third-party CMP, no extra JS payload, no cookies until consented

### SEO
- [x] Next.js Metadata API on every page: title, description, canonical URL
- [x] OpenGraph + Twitter card on every page
- [x] hreflang alternates for both locales + `x-default`
- [x] Dynamic `app/sitemap.ts` (home + categories + products in both locales, with hreflang); `/admin/*` excluded
- [x] `app/robots.ts` allows all, **disallows `/admin`**, points at sitemap
- [x] Default OG image (`app/opengraph-image.tsx`) and per-product OG images
- [x] Semantic HTML throughout
- [x] One `<h1>` per page
- [x] All images via `next/image` with descriptive alt text
- [x] Visible breadcrumbs on non-home pages
- [x] Clean, query-string-free URLs

### Structured data (JSON-LD)
- [x] Organization (root layout)
- [x] LocalBusiness (home page) — address, geo, opening hours
- [x] WebSite + SearchAction (root layout)
- [x] BreadcrumbList (every category + every product page)
- [x] ItemList (every category page)
- [x] Product (every product detail page)
- [x] FAQPage (home page)

### AEO (Answer Engine Optimization)
- [x] `public/llms.txt`
- [x] FAQ in Q + concise A style
- [x] Each category opens with an 80–120 word factual intro
- [x] Entity-rich headings

### Security
- [x] `Strict-Transport-Security` (2 years)
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` blocking camera/microphone/geolocation
- [x] `Content-Security-Policy` (`default-src 'self'`, restricted sources)
- [x] `.env*` excluded from git
- [x] Service-role key marked `import "server-only"`
- [x] Every input runs through Zod
- [x] RLS enabled on every table; views (none yet) would default to `security_invoker = true`

### Performance
- [x] SSG / ISR for all public routes (categories + products `revalidate = 300`)
- [x] `next/font` for Fraunces + Inter, self-hosted with `display: swap`
- [x] `next/image` everywhere with `sizes`, `priority` on the hero
- [x] Mobile-first responsive

### Accessibility
- [x] Skip-to-content link
- [x] Visible focus rings (`:focus-visible`)
- [x] Lang attribute per locale
- [x] All interactive elements keyboard-accessible
- [x] aria-current on active breadcrumb / locale
- [x] WCAG AA contrast

### Build hygiene
- [x] `npm run build` passes with **zero errors and zero warnings**
- [x] `npm run lint` passes with **zero issues**

---

## Before you launch

### Brand & content
- [ ] Replace placeholder address, phone, email in `lib/site-config.ts`
- [ ] Replace social URLs in `lib/site-config.ts`
- [ ] Replace product photos (currently `picsum.photos`) — upload to the `product-images` Storage bucket via the admin panel, or update `content/products.ts` if running offline
- [ ] Add your real image CDN host to `images.remotePatterns` in `next.config.ts` if you serve from outside Supabase Storage
- [ ] Replace FAQ answers in `content/faq.ts`
- [ ] Tighten the brand-story copy in `messages/ka.json` / `messages/en.json`

### Supabase
- [ ] Create a Supabase project; run `supabase/schema.sql` then `supabase/seed.sql`
- [ ] Create a Supabase Auth user and `INSERT INTO admin_users (user_id, role) VALUES ('<UUID>', 'admin')`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in your hosting environment

### Configuration
- [ ] Set `NEXT_PUBLIC_SITE_URL` to your real domain in production
- [ ] Set `NEXT_PUBLIC_ANALYTICS_DOMAIN` if you want analytics enabled (and replace the placeholder `<Script>` in `components/analytics.tsx` with your provider)
- [ ] Verify `lib/site-config.ts` GPS coordinates point at your actual showroom

### Optional improvements
- [ ] Wire a real `/search` route (JSON-LD already advertises one)
- [ ] Add a `/contact` page (`localBusinessJsonLd` already supports it)
- [ ] Tighten Content-Security-Policy: switch from `'unsafe-inline'` to nonce-based CSP
- [ ] Add a third locale (Russian?) — see `README.md` § "Add a new locale"
- [ ] Run a real Lighthouse audit on the deployed URL (target: 95+ on all four scores)
- [ ] Submit `sitemap.xml` to Google Search Console and Bing Webmaster Tools
- [ ] Run `supabase db advisors` and resolve any warnings
- [ ] Rotate the `service_role` key after launch and confirm it lives only in server env (never `NEXT_PUBLIC_`)

## Scheduled maintenance

- [ ] **2026-05-16 (2 weeks after Plan 2 ship date 2026-05-02):** A scheduled agent will open a cleanup PR.
  - Remove `suggestSlugAction` from `app/(admin)/admin/(dashboard)/products/actions.ts` if no caller imports it (live preview now runs client-side via `lib/slug.slugify`).
  - Prune `not_found_log` rows older than 60 days whose `path` now resolves through a redirect — keeps the SEO dashboard's "Recent 404s" list usefully short.
