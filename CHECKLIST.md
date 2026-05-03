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
- [x] Granular first-party banner (`components/consent/banner.tsx`), `fm_consent` cookie, ka/en
- [x] Settings sheet (`components/consent/settings-sheet.tsx`) with per-category toggles, reachable from the footer's Manage cookies link
- [x] `components/analytics-loader.tsx` only loads provider scripts (GA4 / GTM / Meta / Plausible) after the user grants analytics or marketing consent
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
- [x] `next/font` for Fraunces + Inter (Latin) + Noto Sans/Serif Georgian, self-hosted with `display: swap`
- [x] `next/image` everywhere with `sizes`, `priority` on the hero, blur placeholders on hero/product/category cards via `lib/perf/blur.ts`
- [x] AVIF + WebP delivery, 1y `minimumCacheTTL`, calibrated `deviceSizes`/`imageSizes`, locked `remotePatterns` (see `lib/perf/image-config.ts`)
- [x] Supabase preconnect in `<head>` (only when `NEXT_PUBLIC_SUPABASE_URL` is set)
- [x] Analytics preconnects gated by cookie consent (inside `AnalyticsLoader`)
- [x] `experimental.viewTransition` + `<ViewTransition>` wrapping `<main>`; `prefers-reduced-motion` collapses durations to zero
- [x] OG image route has `Cache-Control: max-age=3600, s-maxage=3600, stale-while-revalidate=86400`
- [x] `npm run analyze` (webpack + `@next/bundle-analyzer`) wired up; Turbopack alternative: `npx next experimental-analyze`
- [x] Real User Monitoring: `useReportWebVitals` reporter posts LCP/INP/CLS/FCP/TTFB to `/api/vitals` (anonymous, no consent) and fans out a `web_vitals` analytics event (consent-gated). Admin tile on `/admin` shows p75 over 7d via the `web_vitals_p75_7d` Postgres view.
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

### Brand identity confirmation (drives OG / Twitter card visuals)

`lib/site-config.ts` exports a `brand` block that the OG image templates in `lib/og/` read at render time. Confirm the values below match the launch identity before pushing to production — every share preview on Facebook / X / LinkedIn / WhatsApp / Telegram / Slack / Discord uses them.

- [ ] **Brand accent** — `siteConfig.brand.accent` (`#b85c38` warm terracotta). Confirm against the print/web brand guide.
- [ ] **Brand background** — `siteConfig.brand.background` (`#fbf8f3` warm off-white). Confirm contrast against the foreground colour reads ≥ AA.
- [ ] **Brand foreground** — `siteConfig.brand.foreground` (`#28201a` deep neutral).
- [ ] **Brand muted text** — `siteConfig.brand.muted` (`#7a6f5e` muted earth) for eyebrows and footer captions.
- [ ] **Brand monogram** — `siteConfig.brand.logoMonogram` (`F`). Swap to a 2-char monogram (e.g. `FM`) if the design system prefers it.
- [ ] **Brand tagline (ka)** — `siteConfig.brand.tagline.ka` (`ხელნაკეთი ავეჯი თბილისში`). Confirm copy.
- [ ] **Brand tagline (en)** — `siteConfig.brand.tagline.en` (`Handmade modern furniture from Tbilisi`). Confirm copy.
- [ ] Optional: drop a logo SVG into `public/` and point `siteConfig.brand.logoSvgPath` at it; the templates fall back to the monogram when this is null.

### OG / Twitter card platform smoke (run after a real domain is up)

The site exposes these card routes (all return `image/png` with `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`):

- `/opengraph-image`, `/twitter-image`, `/twitter-image-square` (root, locale-agnostic)
- `/[locale]/opengraph-image`, `/[locale]/twitter-image`, `/[locale]/twitter-image-square`
- `/[locale]/[category]/opengraph-image`, `/[locale]/[category]/twitter-image`, `/[locale]/[category]/twitter-image-square`
- `/[locale]/[category]/[slug]/opengraph-image`, `/[locale]/[category]/[slug]/twitter-image`, `/[locale]/[category]/[slug]/twitter-image-square`

Run each of the platform validators below against a deployed product URL and a category URL in both locales. Record date and pass/fail.

- [ ] **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/ — paste `https://furnituremodern.vercel.app/ka/sofas/<slug>` and a `/en/...` variant. Expect 1200×630 image, no errors.
- [ ] **X Card Validator** — paste the same URLs; card type should resolve to `summary_large_image`.
- [ ] **LinkedIn Post Inspector** — https://www.linkedin.com/post-inspector/ — verify the OG image renders and aspect is right.
- [ ] **WhatsApp / Telegram preview** — share a product link in a private chat; preview should show the branded card with Georgian text rendered (no tofu/squares).
- [ ] **Slack / Discord** — paste a product URL into a sandbox channel; verify branded card appears.
- [ ] **Supabase Storage public read** — confirm uploaded product images are anonymously readable. The OG product template fetches the primary image URL during render; a 401/403 falls back to monogram-only layout but means social cards lose the photo.
- [ ] Replace product photos (currently `picsum.photos`) — upload to the `product-images` Storage bucket via the admin panel, or update `content/products.ts` if running offline
- [ ] Add your real image CDN host to `images.remotePatterns` in `next.config.ts` if you serve from outside Supabase Storage
- [ ] Replace FAQ answers in `content/faq.ts`
- [ ] Tighten the brand-story copy in `messages/ka.json` / `messages/en.json`
- [ ] Replace the placeholder PWA icons in `public/` (the "F" monogram). Edit `LETTER_PATH` / colours in `scripts/generate-icons.mjs` (or drop a designer SVG into `public/icon.svg`) and re-run `node scripts/generate-icons.mjs`.
- [ ] Add real PWA screenshots to `app/manifest.ts` `screenshots` array once the final design is shipped (mobile + desktop variants).
- [ ] Add manifest `shortcuts` entries to `app/manifest.ts` once the category/product taxonomy is final (e.g. "Sofas", "New arrivals").

### Privacy & legal
- [ ] Confirm `privacyPolicyUpdatedAt` in `lib/site-config.ts` reflects the actual most recent edit before launch.
- [ ] Confirm `siteConfig.contact.email` (currently `hello@furnituremodern.ge`) is correct and monitored — the privacy page links to it for data-rights requests.
- [ ] Confirm whether GA4, GTM, Meta Pixel, or Plausible will actually be enabled at launch, and rewrite the privacy page's "Who we share it with" conditional language ("If we enable …") into definite language for the providers that will actually run.
- [ ] **Replace placeholder Georgian privacy policy text with legal-counsel-reviewed copy before launch.** Current text is plain-language drafted in good faith and is NOT legal advice.

### Supabase
- [ ] Create a Supabase project; run `supabase/schema.sql` then `supabase/seed.sql`
- [ ] Create a Supabase Auth user and `INSERT INTO admin_users (user_id, role) VALUES ('<UUID>', 'admin')`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in your hosting environment

### Configuration
- [ ] Set `NEXT_PUBLIC_SITE_URL` to your real domain in production
- [ ] Set the provider env vars you want enabled (`NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`). With none set, `components/analytics-loader.tsx` mounts no scripts.
- [ ] Verify `lib/site-config.ts` GPS coordinates point at your actual showroom

### Optional improvements
- [ ] Wire a real `/search` route (JSON-LD already advertises one)
- [ ] Add a `/contact` page (`localBusinessJsonLd` already supports it)
- [ ] Tighten Content-Security-Policy: switch from `'unsafe-inline'` to nonce-based CSP
- [ ] Add a third locale (Russian?) — see `README.md` § "Add a new locale"
- [ ] Run a real Lighthouse mobile audit on the deployed URL — placeholder phase: Performance ≥ 90, SEO 100, Accessibility ≥ 95, Best Practices 100. After real photos: Performance ≥ 95.
- [ ] Capture per-route First Load JS once Next 16's Turbopack build summary or analyzer pipeline reports it natively, then ratchet the bundle budget at *baseline + 5%*. Today the 180 KB target is a Lighthouse-derived ceiling, not a CI gate.
- [ ] Verify p75 INP < 200 ms once the RUM dashboard has a week of real traffic.
- [ ] After deployment, visit the live site once, then refresh `/admin` — confirm the "Real User Performance (7d)" tile shows non-zero samples within ~5 minutes (the reporter beacons fire on visibilitychange/pagehide). If the tile stays empty, check: cookie consent isn't blocking the *first-party* beacon (it shouldn't; only third-party analytics is gated); browser blocks `sendBeacon`; Supabase env is configured on the deployment; no bot UA on the test client.
- [ ] Submit `sitemap.xml` to Google Search Console and Bing Webmaster Tools
- [ ] Run `supabase db advisors` and resolve any warnings
- [ ] Rotate the `service_role` key after launch and confirm it lives only in server env (never `NEXT_PUBLIC_`)

### Structured-data confirmations

These are real placeholder values in `lib/site-config.ts` — confirm with the business and update them before launch. Each one is read by Product/Offer JSON-LD on every product page, so wrong values mean wrong rich results.

- [ ] **Return policy** — `siteConfig.returnPolicy`. Today: 14-day FiniteReturnWindow, ReturnByMail, FreeReturn, applicable in Georgia. Confirm window length, return method, and who pays return shipping.
- [ ] **Shipping policy** — `siteConfig.shipping`. Today: 0 GEL flat rate, 1–3 days handling + 2–7 days transit, Georgia only. Confirm the actual rate (or rate matrix), realistic handling/transit ranges, and any region-specific shipping outside Georgia.
- [ ] **Payment methods** — `siteConfig.paymentAccepted`. Today: Cash, CreditCard, DebitCard, BankTransfer. Confirm which the business actually takes; remove any not supported.
- [ ] **Opening hours** — `siteConfig.contact.openingHours`. Confirm against the showroom schedule.
- [ ] **Geo coordinates** — `siteConfig.contact.geo.{latitude,longitude}`. Confirm they point at the actual showroom door, not Tbilisi center.
- [ ] **Product SKU / MPN strategy** — decide whether `id` (UUID) is acceptable as `sku` or whether the admin should issue a human SKU. If human, populate `products.sku` (and optional `mpn`) in the admin form + DB.
- [ ] **Product availability strategy** — confirm that "published = InStock" holds. If made-to-order pieces should signal `PreOrder` or `BackOrder`, surface a per-row `availability` column and pass it through.

### Rich Results validation

Run Google Rich Results Test on the three highest-value pages once a real domain is up. Record results below.

- [ ] **Home** — `/${locale}` — expect Organization, FurnitureStore, WebSite + SearchAction, WebPage, FAQPage with Speakable.
- [ ] **Category** — pick `/${locale}/sofas` — expect BreadcrumbList, CollectionPage, ItemList.
- [ ] **Product** — pick `/${locale}/sofas/<a-slug>` — expect Product with Offer, hasMerchantReturnPolicy, shippingDetails, BreadcrumbList.

For each page: record date tested, tool URL used, pass/fail, and any warnings the validator flags. Acceptable warnings (because data is genuinely unavailable today): missing dimensions, weight, color, material, mpn — these only emit when a row in the catalog actually carries the value.

### AEO (Answer Engine Optimization)

- [ ] **Open `/llms.txt`** in production — Georgian section appears first, English second; every category URL is absolute and resolves; no `/admin` or `/api/admin` URLs in the output.
- [ ] **Open `/llms-full.txt`** in production — same locale ordering; every published product appears under its category with price + URL; soft-deleted products are absent; no `undefined` tokens in the body.
- [ ] **Confirm AEO summary copy** on home and a category page: brand name, location wording, service area, languages, and category names match real business facts.
- [ ] **Confirm delivery/service area wording** in `siteConfig.areaServed.country` matches what the business actually serves.
- [ ] **No hidden keyword stuffing** — view source and verify the AEO summary panels are visually rendered, not display:none, and read the same as visible page content.
- [ ] **AI crawler discovery** — after deployment, confirm the head of any locale page contains `<link rel="alternate" type="text/plain" href=".../llms-full.txt">`.
- [ ] **Last-updated dates** appear on category and product pages and are sourced from real `updated_at` data (not the deploy time).

### Verification — manual

- [ ] View source on home / category / product pages and confirm exactly one of each schema block, no duplicates, no `null` leakage.
- [ ] Confirm every `<script type="application/ld+json">` carries a `nonce=` attribute.
- [ ] `/${locale}/search?q=test` returns 200 (not 404).
- [ ] Search engine console verifications: Google, Bing, Yandex, Facebook (env vars in `.env.example`).

### PWA — manual verification

- [ ] `/manifest.webmanifest` loads in production and is valid JSON. Open DevTools → Application → Manifest and confirm name, short_name, theme/background colour, and every icon URL resolve without errors.
- [ ] All icon URLs return 200: `/icon.svg`, `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`.
- [ ] Mobile install prompt appears (Chrome: address-bar install icon, or Add to Home Screen). Installed app launches into `/ka`.
- [ ] iOS Safari: "Add to Home Screen" shows the apple-touch-icon (no transparent background, no jagged edges).
- [ ] Theme colour appears on the browser tab (Chrome desktop) and the system status bar (Android Chrome standalone, iOS Safari).
- [ ] Service worker registers in production. DevTools → Application → Service Workers shows `sw.js` in `activated` state.
- [ ] Service worker does **not** register in `npm run dev` — DevTools shows zero registrations after a dev page load (the registrar tears them down).
- [ ] Offline fallback: in DevTools → Network → Offline, navigate to a path that wasn't loaded yet — `/offline.html` content renders. Refreshing back online recovers the live page.
- [ ] **Admin is not cached:** open `/admin` while online, switch to offline, navigate to `/admin/products` — page does NOT load from cache (offline fallback shown instead).
- [ ] **API not cached:** confirm `/api/vitals` (and any other `/api/*` route) does not return from the SW cache. Network tab "(disk cache)" should never appear for API responses.
- [ ] Product/category pages reflect the latest ISR revalidation. After publishing a product change in `/admin`, the public page shows the new value within the ISR window — the SW does NOT serve a stale HTML body.
- [ ] No console errors in production related to SW registration, manifest parsing, or icon loading.
- [ ] No CSP violations in DevTools Console for SW or manifest fetches.
- [ ] Lighthouse PWA audit on a production build improves the "Installable" + "PWA optimised" categories without regressing Performance, SEO, Accessibility, or Best Practices.

## Scheduled maintenance

- [ ] **2026-05-16 (2 weeks after Plan 2 ship date 2026-05-02):** A scheduled agent will open a cleanup PR.
  - Remove `suggestSlugAction` from `app/(admin)/admin/(dashboard)/products/actions.ts` if no caller imports it (live preview now runs client-side via `lib/slug.slugify`).
  - Prune `not_found_log` rows older than 60 days whose `path` now resolves through a redirect — keeps the SEO dashboard's "Recent 404s" list usefully short.

- [ ] **`web_vitals` retention.** Until Phase 4 ships scheduled jobs, run the snippet below manually (monthly is fine) so the table stays bounded:

  ```sql
  DELETE FROM public.web_vitals
  WHERE occurred_at < now() - interval '90 days';
  ```

- [ ] **RUM sampling upgrade.** Today the reporter samples per-event (set by `NEXT_PUBLIC_RUM_SAMPLE_RATE`, default `1.0`). Per-event sampling at low rates leaves low-traffic pages without coverage. When traffic exceeds ~100k events/day, switch to **session-based sampling**: roll the dice once per page-load (or per session) and either send all metrics for that session or none. Sketch: derive a 0..1 number from `crypto.randomUUID()` once at module import, compare against the rate, and gate every metric on that single decision instead of `Math.random()` per metric.
