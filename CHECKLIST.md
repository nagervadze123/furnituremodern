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
- [x] **Product detail** (`/[locale]/[category]/[slug]`) — multi-image `Gallery` (Server shell + `GalleryClient` island for thumbnails / lightbox / keyboard nav / focus restore / reduced-motion fallback), name, price, description, breadcrumbs, ISR (`revalidate = 300`)
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
- [x] Multi-image gallery management (`components/admin/image-manager.tsx`) — multi-file upload with optimistic tiles, dnd-kit drag-drop reorder (keyboard-accessible), set-primary toggle, per-image bilingual alt text, delete with confirm; size cap 10MB, MIME allowlist (jpeg/png/webp/avif), max 12 images per product. All mutations go through admin server actions in `images-actions.ts` with `logError` on failure.
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
- [x] `Strict-Transport-Security` 2 years, `includeSubDomains; preload` (preload submission deferred until custom domain — see "Security headers — phased work" below)
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY` (paired with CSP `frame-ancestors 'none'`)
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` blocks camera/microphone, opts out of FLoC, and disables payment / usb / magnetometer / gyroscope / accelerometer; geolocation scoped to `(self)`
- [x] `Cross-Origin-Opener-Policy: same-origin`
- [x] `Cross-Origin-Resource-Policy: same-origin`
- [x] `X-DNS-Prefetch-Control: on`
- [x] `Origin-Agent-Cluster: ?1`
- [x] `Content-Security-Policy` per-request nonce + `'strict-dynamic'`; no `'unsafe-eval'` or `'unsafe-inline'` in production `script-src`; analytics provider domains conditionally included via `lib/security/csp.ts` (see `lib/security/csp.test.ts` for the full contract)
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
- [x] Skip-to-content link (header.tsx, localized via `nav.skipToContent`)
- [x] `<main id="main-content">` target landmark in `app/[locale]/layout.tsx`
- [x] Visible focus rings (`:focus-visible` global rule in globals.css)
- [x] Lang attribute per locale
- [x] All interactive elements keyboard-accessible
- [x] aria-current on active breadcrumb / locale
- [x] WCAG AA contrast on body + headings (foreground on background measured 15.1:1)
- [x] Forms: every input has explicit `<label htmlFor>` + `aria-required` on required, errors associated via `aria-describedby` with `aria-invalid` (login-form, product-form, settings-sheet)
- [x] Form-level status messages wrapped in `role="status" aria-live="polite"` (success/info) or `role="alert" aria-live="assertive"` (login failure). WCAG 4.1.3.
- [x] Submit buttons set `aria-busy` while a transition is pending (login-form, product-form)
- [x] Modal triggers (ManageLink) set `aria-haspopup="dialog"` + `aria-expanded`
- [x] Footer link groups wrapped in `<nav aria-labelledby>` so AT users get separate Explore / Legal / Social landmarks
- [x] External social links append a visually-hidden " (opens in a new window)" hint — WCAG 3.2.5 (AAA, Change on Request)
- [x] Reduced motion: `@media (prefers-reduced-motion: reduce)` rule in globals.css collapses View Transitions, animations, and transitions to ~0s
- [x] Sheet (base-ui Dialog) provides modal focus trap + Escape close natively; `motion-reduce:transition-none` on the Settings sheet content for the animation specifically

### Build hygiene
- [x] `npm run build` passes with **zero errors and zero warnings**
- [x] `npm run lint` passes with **zero issues**

---

## Before you launch

### Brand & content
- [ ] Replace placeholder address, phone, email in `lib/site-config.ts`
- [ ] Replace social URLs in `lib/site-config.ts`

### Home page copy review (Phase 5 Task 5)

The Phase 5 redesign drafted Georgian-first copy under `messages/ka.json` → `home.*` (English mirrored in `messages/en.json`). All entries below are operator-drafted PLACEHOLDERS — review and refine before launch. The copy ships as-is so the build is presentable now, but every line is editable in the messages files without code changes.

- [ ] `home.hero.eyebrow / heading / body / cta_primary / cta_secondary` — short editorial hero. Confirm the Georgian tagline "თბილისში დამზადებული" + headline match the operator's voice.
- [ ] `home.featured_categories.eyebrow / heading / cta_label` — section intro for the asymmetric category strip.
- [ ] `home.signature_products.eyebrow / heading / intro` — section intro for the most-recent-products carousel. Title currently reads "უახლესი ნამუშევრები" / "What's coming out of the workshop" — operator may prefer "Featured" / "ფირმის ნიშნული".
- [ ] `home.brand_story.eyebrow / heading / body / image_alt` — 60/40 image+prose strip. Body is two sentences of brand story — extend or shorten as the operator prefers. Image_alt describes the lifestyle photo for screen-readers.
- [ ] `home.quality.eyebrow / heading + 3 items` — the three trust signals. Default order: Handcrafted, Natural materials, 10-year warranty. Operator may swap any of the three (e.g. "Free Tbilisi delivery") and update the matching Lucide icon in `components/home/QualityStrip.tsx`.
- [ ] `home.visit.eyebrow / heading / body / cta` — pre-footer "visit our studio" band. The CTA opens a `mailto:` to `siteConfig.contact.email` — switch to a real booking flow when one exists.

### Home page hero photo + featured-category photos (Phase 5 Task 5)
- [ ] Confirm the home hero photo (`siteConfig.brand.heroImage.storageKey`) is operator-approved — currently `stock/hero-home-default.jpg`.
- [ ] (Optional) Set per-category hero images via `/admin/categories` → `image_url` field. When NULL, `components/home/FeaturedCategories.tsx` falls back to a hardcoded category-keyed stock photo.
- [ ] Run Lighthouse mobile against the production deploy of `/ka` and `/en` after this lands. Record scores here:
  - `/ka` Lighthouse: Performance __, SEO __, Accessibility __, Best Practices __  (target P ≥ 90, S = 100, A ≥ 95, BP = 100)
  - `/en` Lighthouse: Performance __, SEO __, Accessibility __, Best Practices __
  - LCP target ≤ 2.5s on 4G throttled. The hero `<Image priority>` is the LCP candidate.
- [ ] Run Google Rich Results Test against the deployed `/ka` and `/en`. Confirm Organization + WebSite + LocalBusiness + WebPage + FAQPage + ItemList all valid.

### Category + product page content (Phase 5 Task 5.x)

The category and product pages were redesigned to match the home page's editorial aesthetic. The visual quality of those pages depends on each row carrying enough content for the new layout — a one-line tagline or a missing material field shows up immediately. Confirm before launch:

- [ ] **Category intro paragraphs** (`/admin/categories` → `intro_ka` / `intro_en`) — long enough to fill the editorial hero. Target 80–120 words per locale; one-line taglines look anaemic in the new layout. The seeded categories already pass, but operator-added rows can ship with a short value.
- [ ] **Category hero image** (`image_url` per row) — when set, the hero renders the asymmetric 60/40 prose+image layout; when NULL, it falls back to the centred minimalist layout. Both are launch-ready; pick per-category.
- [ ] **Product spec coverage** (`/admin/products`) — every product should have `material`, `dimensions` (W×D×H), `weight`, and `color` filled. The product page renders a `<dl>` spec table; missing fields silently disappear, but a half-empty spec card looks unfinished. SKU/MPN are optional but improve Product JSON-LD.
- [ ] **Product description length** — the layout splits on the first paragraph break: first paragraph → info-column lede, remainder → "About this piece" long-form section below the gallery. Aim for at least one paragraph break in every product so the long-form section renders.
- [ ] **Product availability** (`availability` enum) — defaults to `InStock` in the JSON-LD when omitted, but the visible "Availability" line on the page reads from the column directly. Set explicitly on every row before launch so the visible line stays in sync with the schema.
- [ ] Run Lighthouse mobile against `/ka/sofas` and `/ka/sofas/<slug>` post-deploy. Record scores here:
  - `/ka/sofas` Lighthouse: Performance __, SEO __, Accessibility __, Best Practices __ (target P ≥ 90, S = 100, A ≥ 95, BP = 100)
  - `/ka/sofas/<slug>` Lighthouse: Performance __, SEO __, Accessibility __, Best Practices __
  - LCP target ≤ 2.5s. Category page LCP is the hero photo (or the first product card when no hero image is set); product page LCP is the gallery's primary image (`priority` set in `components/product/gallery-client.tsx`).
- [ ] Validate Product JSON-LD on `/ka/sofas/<slug>` via Google Rich Results — image array, brand, offers (price, currency, availability, return policy, shipping) all green.
- [ ] Validate ItemList JSON-LD on `/ka/sofas` — every product surfaces with name, image, price, and offer URL.

### Brand identity confirmation (drives OG / Twitter card visuals)

`lib/site-config.ts` exports a `brand` block that the OG image templates in `lib/og/` read at render time. Confirm the values below match the launch identity before pushing to production — every share preview on Facebook / X / LinkedIn / WhatsApp / Telegram / Slack / Discord uses them.

- [ ] **Brand accent** — `siteConfig.brand.accent` (`#b85c38` warm terracotta). Confirm against the print/web brand guide. **Phase 4 Task 4 contrast finding:** white text on this accent is 4.3:1 — passes AA non-text (3:1) and AA-large body (3:1) but fails AA body (4.5:1) and AAA body (7:1). Today the value is used only as a focus-ring color and OG-card decoration band, never as a runtime body-text color, so it sits in the non-text bucket where 3:1 is the floor. Operator must approve before any future use as accent CTA text or body color, OR adopt one of the tightened replacements proposed in `lib/site-config.ts` comments (`#9a4a25` for AA body, `#7d3a18` for AAA body).
- [ ] **Brand background** — `siteConfig.brand.background` (`#fbf8f3` warm off-white). Confirm contrast against the foreground colour reads ≥ AA. Measured: foreground/background reads 15.1:1 — AAA pass with margin.
- [ ] **Brand foreground** — `siteConfig.brand.foreground` (`#28201a` deep neutral).
- [ ] **Brand muted text** — `siteConfig.brand.muted` (`#7a6f5e` muted earth) for eyebrows and footer captions. **Phase 4 Task 4 contrast finding:** 4.7:1 against the brand background — AA body pass, AAA body fail (target 7:1). Used only for non-primary text (eyebrows, footer captions, form hints), so AA is the appropriate target. Operator may bump to `#5a4f3f` (~7.1:1) if AAA across the board is required.
- [ ] **Brand monogram** — `siteConfig.brand.logoMonogram` (`F`). Swap to a 2-char monogram (e.g. `FM`) if the design system prefers it.
- [ ] **Brand tagline (ka)** — `siteConfig.brand.tagline.ka` (`ხელნაკეთი ავეჯი თბილისში`). Confirm copy.
- [ ] **Brand tagline (en)** — `siteConfig.brand.tagline.en` (`Handmade modern furniture from Tbilisi`). Confirm copy.
- [ ] Optional: drop a logo SVG into `public/` and point `siteConfig.brand.logoSvgPath` at it; the templates fall back to the monogram when this is null.
- [ ] **Brand hero photo credit** — `siteConfig.brand.heroLandingPhotoCredit` (PLACEHOLDER, currently empty). Phase 5.4 surfaces this string under the home-page hero photo if non-empty. Set to e.g. `"Photo: Studio Tbilisi"` if the launch hero requires attribution; leave empty otherwise.
- [ ] **Signature product slug** — `siteConfig.brand.signatureProductSlug` (PLACEHOLDER, currently `null`). Phase 5.5's home-page hero CTA deep-links to this product. Set to a real catalogue slug (e.g. `"walnut-frame-loveseat"`) before launch; `null` falls back to the first featured product.

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
- [ ] **All stock photography is placeholder.** Phase 5 Task 4 swapped the random `picsum.photos` placeholders for curated furniture stock photography from Unsplash + Pexels. **Replace with real product photography of items the operator actually sells before launch.** Each replacement is one row update in `product_images` + one new file in Supabase Storage. The admin image manager surfaces the `source` / `photographer` columns so it's clear which rows are still stock placeholders.
- [ ] **Stock photo licensing.** Unsplash and Pexels are commercially-permissive without required attribution, but courtesy attribution is documented in the `product_images.source` / `source_url` / `photographer` columns and visible in admin. Real product photos should leave those columns NULL.
- [ ] **Hero photo on home page.** `lib/site-config.ts → siteConfig.brand.heroImage` points at `stock/hero-home-default.jpg`. Replace with an operator-shot 21:9 lifestyle frame before launch.
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

### Security headers — phased work

The production CSP and security-headers baseline lives in `next.config.ts` (static headers) and `lib/security/csp.ts` (per-request CSP nonce, applied via `proxy.ts`). Each header is tested in `lib/security/csp.test.ts`. The items below intentionally stay un-flipped until the matching feature ships.

- [ ] **Pre-launch — submit HSTS to the preload list.** Once a real custom domain (`furnituremodern.ge` or similar) is attached and serving HTTPS, submit it at https://hstspreload.org/. Do **not** submit while the site is still on the `.vercel.app` subdomain — the preload commitment is one-way and ~6 months to reverse. The header in `next.config.ts` already advertises `preload`; submission is the explicit step.
- [ ] **Phase 4 — tighten style-src to nonce-based.** Today `style-src 'self' 'unsafe-inline'` because Next/shadcn occasionally inject inline styles. When the framework + UI primitives no longer need it, drop `'unsafe-inline'` and apply the per-request nonce to styles too. Add a regression test in `lib/security/csp.test.ts` once flipped.
- [ ] **Phase 6 — Permissions-Policy `payment=(self)` when payment forms ship.** Today `payment=()` (fully blocked). Update the `Permissions-Policy` value in `next.config.ts` only when the payment surface is being introduced — flipping early would silently allow payment APIs that no UI uses.

### Optional improvements
- [ ] Wire a real `/search` route (JSON-LD already advertises one)
- [ ] Add a `/contact` page (`localBusinessJsonLd` already supports it)
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

### Error pages, search stub, observability — manual

- [ ] Visit `/${locale}/[invented-bad-slug]` in production: branded 404 renders, four navigation cards present, recent products section appears (when products exist) or is silently omitted (when not), breadcrumbs correct, page heading is in the user's locale, robots meta is `noindex,nofollow`. `curl -s -o /dev/null -w "%{http_code}\n" /ka/sofas/__bad__` returns **404** (not 200).
- [ ] Temporarily `throw new Error("test")` at the top of `app/[locale]/page.tsx`, then revert: `error.tsx` renders the friendly Georgian/English message, "Try again" button calls `unstable_retry`/`reset` and recovers the page, the digest reference id is shown when present. With `NODE_ENV=development`, the dev console shows a single `[observability] logError` warning per render.
- [ ] Visit `/${locale}/search` and confirm the stub renders the breadcrumbs, headline, four-card category grid, and a noindex meta. Visit `/${locale}/search?q=test` and confirm `q` echoes safely. Visit `/${locale}/search?q=<script>alert(1)</script>` and confirm **no script execution**, the term renders as plain text, no console errors.
- [ ] View source on `/search`: exactly one `<meta name="robots" content="noindex,nofollow">` and the canonical URL ends with `/${locale}/search` (no `?q=`).
- [ ] Force a layout-level crash: temporarily `throw` at the top of `app/[locale]/layout.tsx`, then revert: `app/global-error.tsx` renders the inline-styled English fallback, "Go home" navigates via `window.location.assign("/")`, robots meta noindex is present.
- [ ] Note: `app/global-error.tsx` is **English-only by design**. Loading the i18n bundle is itself error-prone; reaching for it again from the very boundary that was meant to catch its failure is a footgun. Do not localize this page.
- [ ] Visit `/${locale}/gone` (Plan 2's 410 route): regression check — still renders the localized English/Georgian copy with status 410, no changes from this task.
- [x] **Phase 4 task — Sentry wiring.** Done: `@sentry/nextjs` is installed and wired through `lib/observability.ts`. Public signatures (`logError(error, ctx)` / `logEvent(name, payload)`) unchanged; the SDK stays dormant when `NEXT_PUBLIC_SENTRY_DSN` is unset. PII scrubbers in `lib/observability/scrub.ts` strip IP, cookies, IP-bearing headers, the User-Agent, and (browser only) URL query strings + Authorization headers.
- [ ] **Sentry env vars on Vercel** — set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel → Project Settings → Environment Variables (**Production environment only**) before the next deploy that requires symbolicated stack traces. Without them, builds succeed but stack traces stay minified.

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

- [ ] **Quarterly checklist sweep.** Re-read this file end-to-end and prune items that no longer apply. Update Phase X priorities below to reflect what's actually shipped vs. still planned.

---

## Final pre-launch verification (run on production deployment)

Before flipping DNS / launch announcement, walk this list against the live `https://<domain>/` build. Every item should be smoke-tested in a browser, not assumed.

- [ ] **Custom domain attached to Vercel and HSTS preload submitted** at https://hstspreload.org/ once the apex is on HTTPS. The header in `next.config.ts` already advertises `preload`; submission is the explicit step. Do **not** submit while still on `*.vercel.app`.
- [ ] **Real product photos uploaded** to the Supabase Storage `product-images` bucket; placeholder `picsum.photos` is no longer referenced in any seeded row, AND `product_images.source` is NULL on every published row (it's `'unsplash'` / `'pexels'` only on the Phase 5 Task 4 stock placeholders that still need swapping). Grep `content/products.ts` and the live DB to confirm.
- [ ] **Real Georgian descriptions, SKUs, materials, dimensions, weights** populated for every product in the live admin. Empty fields silently drop the matching JSON-LD property — Rich Results Test will flag them.
- [ ] **Business config reviewed in `lib/site-config.ts`** — phone, address, social links, `openingHours`, `geo`, `priceRange`, `paymentAccepted`, `returnPolicy`, `shipping`, brand accent + tagline (ka/en).
- [ ] **Vercel env vars set with real values** — GA4, GTM (or both), Meta Pixel, Plausible, Google/Bing/Yandex/Facebook verification, IndexNow, `NEXT_PUBLIC_SITE_URL`. Confirm no `NEXT_PUBLIC_` prefix on `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Rich Results Test** on home, one category, one product URL — record date + result here:
  - Home: ___ / pass / warnings: ___
  - Category: ___ / pass / warnings: ___
  - Product: ___ / pass / warnings: ___
- [ ] **Lighthouse mobile** on three deployed URLs (run against production, not preview) — record:
  - Home: P:__ / SEO:__ / A11y:__ / BP:__
  - Category: P:__ / SEO:__ / A11y:__ / BP:__
  - Product: P:__ / SEO:__ / A11y:__ / BP:__
- [ ] **Lighthouse Accessibility ≥ 98** on every primary public + admin route. Run against production via Chrome DevTools → Lighthouse (mobile preset). Phase 4 Task 4 raised the documented target from ≥ 95 to ≥ 98; record any flagged item that resists fixing as a "false positive" with a one-line justification:
  - `/ka`: A11y:__
  - `/ka/sofas`: A11y:__
  - `/ka/sofas/[product]` (one real product): A11y:__
  - `/ka/privacy`: A11y:__
  - `/admin/login`: A11y:__
  - `/admin`: A11y:__
- [ ] **Manual screen-reader walk** with NVDA (Windows) or VoiceOver (macOS) on `/ka`, `/ka/sofas`, one `/ka/sofas/[product]`, `/ka/privacy`, plus the consent banner flow and the footer "Manage cookies" sheet. Verify:
  - skip-to-content link is the first focusable element and works
  - heading hierarchy on each page reads in document order
  - consent banner is announced when it appears (`role="region"` + `aria-live="polite"`)
  - settings sheet announces as a modal dialog and traps focus
  - admin forms: every field's label is announced, required fields say "required", invalid fields say "invalid" + the visible error
  - submit buttons announce as "busy" while a transition is pending
- [ ] **Brand color confirmation** — operator decides whether the documented contrast trade-offs (accent at 4.3:1, muted at 4.7:1 against background) stay or get tightened to the proposed darker replacements in `lib/site-config.ts`. The `lib/a11y/contrast.test.ts` invariants will need updating in lockstep with any swap.
- [ ] **Consent flow on production:** fresh incognito → banner appears → "Accept all" sets `fm_consent` cookie with both true → settings sheet toggles persist → "Necessary only" sets opposite → no console errors → GA4 / Meta / Plausible network requests fire ONLY after accept.
- [ ] **Slug history works:** rename a product slug in `/admin` → wait ~5 sec → old URL 301-redirects to new URL → `product_slug_history` row exists.
- [ ] **410 path works:** soft-delete a product with the "gone" choice → old URL returns 410 with the branded `/[locale]/gone` body.
- [ ] **`/sitemap.xml` lists** every published product + category in both locales with `hreflang="ka"`, `hreflang="en"`, and `x-default`. `/admin/*` absent.
- [ ] **`/llms.txt` and `/llms-full.txt` render** with Georgian first, "Last regenerated:" timestamp, no `undefined` tokens.
- [ ] **OG image platform smoke** — Facebook Sharing Debugger, X Card Validator, LinkedIn Post Inspector, WhatsApp/Telegram preview all return the branded ImageResponse (not the root fallback) with Georgian glyphs (no tofu).
- [ ] **Replace placeholder Georgian privacy policy text** in `/[locale]/privacy` with legal-counsel-reviewed copy.
- [ ] **Permissions-Policy values** confirmed appropriate for shipped surfaces: `payment=()` until payment forms exist (Phase 6), then flip to `payment=(self)`.
- [ ] **Supabase Point-in-Time Recovery** enabled on the live project (paid plan). Test a restore drill before launch announcement.
- [ ] **Confirm Vercel build uses Node 22.12+** — open a deploy log and verify the "Detected `.nvmrc` Node version: 22.12.0" line. `package.json#engines` blocks anything older locally; this checks Vercel matches.
- [ ] **Confirm `schema.sql` guard active** — locally, run `supabase/schema.sql` against a fresh dev DB (succeeds), seed it, then run it again. The second run must error with `Refusing to run bootstrap schema.sql against a database that already contains data.` Do **not** run this against production.
- [ ] **Confirm slug rename in production admin** produces both the new URL (200) and the redirect entry (301 from old URL); if the redirect insert fails, the admin must see an explicit red error message ("Product saved, but creating the redirect from the old URL failed: …"), not a green "Saved.".
- [ ] **Confirm production-mode Supabase failure renders empty state, not placeholder content** — temporarily revoke the anon role's SELECT on `products` in dev (with `NODE_ENV=production` set), reload `/ka/sofas`, confirm the grid is empty rather than showing the local TS catalogue. Restore the policy when done.
- [ ] **Storage bucket `product-images` policies confirmed** — `public = true` so object reads work via the public URL pattern; **no** public SELECT policy on `storage.objects` (would allow LIST enumeration); admin-only INSERT/UPDATE/DELETE/SELECT on `storage.objects` for `bucket_id = 'product-images'`. Verify in Supabase Studio → Storage → `product-images` → Policies that the four `product_images_storage_admin_*` policies exist and are gated on `private.is_admin()`.
- [ ] **Every published product has at least one image, a primary set, and bilingual alt text** — query in Studio: `SELECT p.slug FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id AND i.is_primary = true);` should return zero rows. Then `SELECT slug, alt_ka, alt_en FROM product_images JOIN products ON ... WHERE alt_ka = '' OR alt_en = '';` — investigate any rows surfaced (the admin shows a soft warning but allows the editor to ship anyway).

---

## Phase 4 priorities (post Plan 3)

- **Security hardening**
  - Tighten `style-src` CSP to nonce-based (drop `'unsafe-inline'` once Next/shadcn no longer inject runtime styles). Add regression test in `lib/security/csp.test.ts`.
  - Submit HSTS to the preload list once the apex is on HTTPS.
- **Observability** _(Sentry wiring landed; sub-items below remain.)_
  - ~~Install `@sentry/nextjs`.~~ Done.
  - ~~Wire `lib/observability.ts` (`logError` + `logEvent`) to real Sentry calls. Public signatures stay stable.~~ Done.
  - ~~Add `sentry.client.config.ts` / `sentry.server.config.ts`. Configure `beforeSend` to enforce the no-PII contract (no IP, email, cookies, session tokens).~~ Done — also added `sentry.edge.config.ts` and `instrumentation.ts`. Scrubbers live in `lib/observability/scrub.ts`.
  - Set `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` in Vercel (production env only) so source maps upload on deploys.
  - Phase 5+ revisit: Sentry Replay (requires explicit consent flow); browser profiling integration.
- **Accessibility** _(Phase 4 Task 4 audit landed; sub-items below remain.)_
  - ~~Lock contrast invariants for brand tokens (`lib/a11y/contrast.test.ts`).~~ Done.
  - ~~Form a11y: `htmlFor`/`id`, `aria-required`, `aria-describedby`, `aria-invalid`, `aria-busy`, `role="status"`/`"alert"` regions on login + product forms.~~ Done.
  - ~~Footer landmarks (`<nav aria-labelledby>` per group), external-link "(opens in a new window)" hint.~~ Done.
  - ~~`aria-haspopup="dialog"` + `aria-expanded` on the cookie ManageLink trigger.~~ Done.
  - Operator: run Lighthouse Accessibility on the six checklist routes and confirm ≥ 98. (See "Final pre-launch verification" above.)
  - Operator: NVDA/VoiceOver walk on the consent + sheet + admin forms. (See "Final pre-launch verification" above.)
  - Operator: brand-color confirmation — accept current accent/muted ratios or pick a darker replacement (`lib/site-config.ts` comments).
- **Developer experience / CI-CD**
  - GitHub Actions on PRs: lint + test + build.
  - Lighthouse CI on preview deploys with budget assertions.
  - Run `supabase db advisors` and resolve any warnings.
- **Dev/Prod Supabase split** — separate project for development experiments so an accidental destructive query never touches production rows.
- **Scheduled jobs** — pg_cron job that prunes `web_vitals` rows older than 90 days; same for the `not_found_log` cleanup currently scheduled manually for 2026-05-16.

## Phase 5 priorities

- **Premium design overhaul** — typography, spacing, hero, product detail UX.
- ~~**Multi-image product gallery** with drag-drop ordering and primary selection.~~ Done — public `Gallery` (`components/product/gallery.tsx` Server shell + `gallery-client.tsx` island) and admin `ImageManager` (`components/admin/image-manager.tsx`) with dnd-kit reorder, set-primary toggle, bilingual alt text, validation (10MB / MIME allowlist / 12-image cap). Server actions: `addProductImage`, `updateImageAlt`, `setPrimaryImage`, `reorderProductImages`, `deleteProductImage` — all in `app/(admin)/admin/(dashboard)/products/images-actions.ts` with `logError` on failure.
- **Real product photos integrated** — LCP retargeted to ≤ 2.5s, Lighthouse Performance ≥ 95.
- ~~**Dynamic categories from Supabase** — remove the hard-coded list in `lib/navigation.ts` / `lib/site-config.ts`.~~ Done — categories live in the `categories` table with `intro_ka`/`intro_en`, `is_featured_in_nav`, `is_deleted`, `deleted_at`, `sort_order`. The data layer (`lib/data/categories.ts`) returns active rows ordered by `sort_order` then `created_at`, wrapped with React `cache()` for request-scope dedupe; production never substitutes the offline TS fallback. Admin `/admin/categories` supports create/edit/soft-delete/restore plus the max-5 nav-flag cap; slug renames record `category_slug_history` and write per-locale + per-product 301 redirects via `lib/admin/category-slug-rename-effects.ts`. Public surfaces (header, footer, not-found, search, OG/Twitter cards, CategoryPage, llms.txt, llms-full.txt) all read from the data layer; `content/category-intros.ts` was deleted and `lib/admin/schemas.ts` no longer hard-gates the slug list.

## Pre-launch confirmations — Phase 5 Task 3
- [ ] **Operator has set `is_featured_in_nav`** on the desired top-nav rows (max 5). Defaults to all 3 seeded categories.
- [ ] **Every active category has bilingual `intro_ka` / `intro_en` populated** (80–120 words each). Empty intro falls back to the tagline (`description_ka` / `description_en`); fine as a temporary state, but launch should ship real long-form copy.
- [ ] **`sort_order` reflects the desired display order** (lowest first). Ties broken by `created_at`.
- [ ] **Image alt text** present on every published product image in both locales (Phase 5 Task 2 reminder, still applies).

## Phase 6 priorities

- Cart + checkout.
- **Bank of Georgia E-Commerce or TBC E-Commerce** payment integration. NOT Stripe — Stripe does not serve Georgia cleanly.
- Order management + customer order emails.
- Update `Permissions-Policy` to `payment=(self)` once the payment surface ships.

## Phase 7 priorities

- User accounts, wishlist, reviews.
- `AggregateRating` schema once reviews exist (already wired in `lib/schema.ts` — just needs data).
- `Person` schema for testimonials.
