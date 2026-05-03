# Furnituremodern — Project State

> Living snapshot of where each Phase / Plan stands. Updated whenever a Plan closes, a Phase rolls over, or a launch-blocker shifts.

Last updated: 2026-05-03

---

## Phase status

| Phase | Status | Notes |
| ----- | ------ | ----- |
| **Phase 1** — CSP + security headers | ✅ Closed | `lib/security/csp.ts` + `next.config.ts`; nonce-based per-request CSP; full contract in `lib/security/csp.test.ts`. |
| **Phase 2** — Slug system + URL safety | ✅ Closed | `redirects` + `product_slug_history` + `not_found_log`; soft-delete with redirect or 410; admin SEO dashboard. |
| **Phase 3** — Consent / Analytics / RUM (+ docs) | ✅ Code complete | Granular `fm_consent`, 2-button banner + footer ManageLink, GA4/GTM/Meta/Plausible providers gated on consent, `/api/vitals` RUM endpoint, web_vitals p75 7d view + admin tile, OG cards, branded error pages, PWA baseline, AEO (`llms.txt` + `llms-full.txt`), search-console verification meta + IndexNow. |
| **Phase 4** — Security AAA + observability + DX/CI | 🟡 In progress | Task 1 (hardening) ✅ complete — see "Phase 4 — Task 1" section below. Tasks 2–6 (Sentry, style-src nonce, AAA contrast, dev/prod Supabase split, CI/CD) queued. See `CHECKLIST.md` "Phase 4 priorities". |
| **Phase 5** — Premium design + real photos | 🟡 Queued | See `CHECKLIST.md` "Phase 5 priorities". |
| **Phase 6** — Cart + checkout + payments (BOG/TBC) | 🟡 Queued | See `CHECKLIST.md` "Phase 6 priorities". |
| **Phase 7** — Accounts + reviews | 🟡 Queued | See `CHECKLIST.md` "Phase 7 priorities". |

---

## Plan 3 — verification gate result

Run on 2026-05-03 against the local working tree on `main` at commit `5dc8e06`.

### Build & test gates

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `npm run lint` → 0 issues | ✅ PASS | exit 0 |
| `npm test` → all unit tests pass | ✅ PASS | 290 tests across 22 files; 0 failures |
| `npx tsc --noEmit` → exit 0 | ✅ PASS | exit 0 |
| `npm run build` → 0 errors, 0 warnings | ✅ PASS | exit 0; 35 user-facing routes (193 OG variants prerendered) |

### Code-level gates (verified by reading source + tests)

| Check | Result | Evidence |
| ----- | ------ | -------- |
| No third-party scripts before consent | ✅ PASS | `components/analytics-loader.tsx` returns `null` until `choice.analytics === true \|\| choice.marketing === true`; `track()` early-returns until consent granted. |
| `/admin` excluded from `/sitemap.xml` | ✅ PASS | `lib/seo/sitemap.ts` only emits home + categories + products. |
| `/admin` disallowed in `/robots.txt` | ✅ PASS | `app/robots.ts` disallow list: `/admin`, `/admin/`, `/api/admin`, `/api/admin/`. |
| RLS enforced on every table; no anon-insert on `web_vitals` / `analytics_event` | ✅ PASS (code-level) | Migration `2026-05-02-analytics-rum.sql` only creates `_admin_select` + `_admin_delete` policies and explicitly DROPs any legacy `_anon_insert` policy. Writes flow through `createSupabaseAdminClient()` (service role) which bypasses RLS. Live spot-check via Supabase MCP was attempted; user denied production read authorization (consistent with policy). |
| No PII in RUM payload | ✅ PASS | `VitalsPayloadSchema` accepts only metric name, value, rating, delta, id (max-128), pathname, locale, navigation_type, effective_connection_type. The route discards raw User-Agent after deriving a 3-bucket `device_type`. No IP, no cookie, no session id stored. |
| No PII in analytics provider events | ✅ PASS | GA4/GTM/Meta/Plausible providers send `item_name`, `item_list_name`, `metric_name`, `content_name` (product names, not user names) plus standard ecommerce ids. No `user_id`, `email`, IP, or session token. |
| Georgian content renders in JSON-LD | ✅ PASS | `lib/schema.ts` reads `product.name[locale]`, `product.description[locale]`, `category[locale].name` — Georgian for `/ka`, English for `/en`. |
| Every new env var optional | ✅ PASS | Build succeeded with `.env.local` containing only Supabase + site URL + revalidate vars; analytics/Sentry/IndexNow/search-verification vars unset. Each loader guards on the var being non-empty. |
| `/api/vitals` POST validation | ✅ PASS | `lib/api/vitals.test.ts` covers schema, sanity bounds, bot UA, Sec-GPC/DNT honoring. |
| `/api/vitals` rate limit (60/min/IP) → 429 | ✅ PASS | `app/api/vitals/route.ts:82-87` returns 429 when `withinRateLimit(ip)` is false. Limiter implementation tested in `lib/api/log-404.test.ts`. |
| Bot UAs return 204 silently | ✅ PASS | `app/api/vitals/route.ts:76`. |
| Sec-GPC / DNT silent 204 | ✅ PASS | `app/api/vitals/route.ts:121` via `honorsPrivacySignal()`. |

### Browser-required gates (deferred to operator on next deployment)

These items require a real browser, real network tab inspection, or live production data and cannot be driven from a CLI agent.

| Check | Status | Why deferred |
| ----- | ------ | ----------- |
| Fresh incognito banner appearance + zero pre-consent third-party requests | DEFERRED | Requires browser DevTools network tab. Code path is verified above. |
| Accept-all / Necessary-only consent persistence in cookie | DEFERRED | Requires browser. Cookie write path tested in `lib/consent/store.test.ts`. |
| GA4 `g/collect` after Accept all (when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` set in Vercel) | DEFERRED | Requires production deployment with real GA4 id. |
| Slug rename → 301 from old URL after ~5s | DEFERRED | Requires live admin write. |
| Soft-delete with "gone" → 410 with branded body | DEFERRED | Requires live admin write. |
| `/sitemap.xml` lists every product/category in both locales | DEFERRED | Requires production fetch. Generator tested in `lib/seo/sitemap.test.ts`. |
| Lighthouse mobile P/SEO/A11y/BP on three production URLs | DEFERRED | Requires production deployment. Targets recorded in `CHECKLIST.md`. |
| 375px-wide layout, 44×44 hit targets, safe-area insets | DEFERRED | Requires real device or DevTools device emulation. |
| `/admin/seo` populated with redirects + 404s; `/admin` RUM tile shows real or empty state | DEFERRED | Requires live admin session + traffic. |
| `/llms.txt`, `/llms-full.txt` live content + AeoSummaryPanel in source | DEFERRED | Requires production fetch. Generator tested. |
| `/api/vitals` POST × 70 → last 10 return 429 (live curl) | DEFERRED | Requires production endpoint. Limiter logic tested. |
| `/ka/privacy` / `/en/privacy` live render + footer ManageLink wiring | DEFERRED | Requires browser. |
| Legacy `"accepted"` / `"declined"` cookie auto-migration | DEFERRED | Requires browser. Migration logic tested in `lib/consent/store.test.ts`. |
| OG image platform smoke (Facebook / X / LinkedIn / WhatsApp) | DEFERRED | Requires deployed URLs. |

**Verdict:** every code-level gate passes. Every browser-required gate is queued for the operator to walk through on the next production deployment, with the manual checklist tracked in `CHECKLIST.md` "Final pre-launch verification".

### Conflicts flagged between Plan 3 markdown and shipped reality

The Plan 3 markdown (`docs/superpowers/plans/2026-05-02-plan-3-consent-analytics-rum.md`) was authored before three deliberate design refinements were applied during execution. The reality (and the operator's expanded spec) wins; the plan markdown is the historical record.

1. **Banner shape.** Plan calls for **3 buttons** (Accept all / Necessary only / Customize). Shipped: **2 buttons** (Accept all / Necessary only) plus a footer "Manage cookies" link that opens the settings sheet. Reason: 3-button rows ate too much vertical space on mobile and the Customize action duplicated the footer's evergreen ManageLink. Commit `315aa29` ("Fix renderer crash on consent banner click; trim banner UX") locked this in.
2. **Storage.** Plan calls for **cookie + localStorage hybrid**. Shipped: **cookie-only** (`fm_consent`). Reason: localStorage SSR semantics added complexity without benefit — the cookie is server-readable and survives the same scenarios. Commit `287d45a` ("Tidy consent + privacy aftermath: drop shim and stale docs") removed the localStorage path.
3. **First-party `/api/analytics` endpoint.** Plan calls for both `/api/analytics` (page-view writes to `analytics_event` table) and `/api/vitals` (RUM writes to `web_vitals`). Shipped: **only `/api/vitals`**. Page-view + ecommerce events fan out to GA4 / GTM / Meta / Plausible directly via `lib/analytics/track()`; the `analytics_event` table exists in the migration but is currently unused at runtime. Reason: first-party page-view storage was redundant with the third-party providers and added a write path with no caller.

None of these refinements weakened the consent contract or the privacy posture. The plan markdown's strict verification gate items 5 ("three actions") and 6 ("both cookie and localStorage") are obsolete relative to shipped code.

---

## Plan 3 status

**✅ COMPLETE** — code-level verification gate fully passed; documentation pass committed; deferred browser-required smoke tests are queued in `CHECKLIST.md` for the operator to run on the next production deployment.

---

## Phase 4 — Task 1 (hardening)

**Status:** ✅ COMPLETE (commit hash recorded after push).

External code review (rated 8/10 code, 6.5/10 launch readiness) flagged four real but small issues post-Plan 3. This task closes all four in a single coherent change. Architectural lock-ins (single Next app, single Vercel deploy, single Supabase project, migrations as production source of truth, service-role-only writes for analytics) were preserved.

### Items shipped

1. **Node 22 pin** — `package.json#engines` tightened to `>=22.12.0` (was `^20.19.0 || >=22.12.0`); `.nvmrc` already pinned to `22.12.0`; README "Prerequisites" rewritten with the `nvm install` / `nvm use` workflow. Vercel auto-detects `.nvmrc` so no Vercel config change is needed.
2. **`schema.sql` bootstrap-only protection** (three layers) — warning header at the very top of `supabase/schema.sql`; runtime PL/pgSQL `DO $$ … $$` guard that raises an exception if `public.products` already contains rows; README "Database workflow" section rewritten with the full migrations-vs-bootstrap distinction.
3. **Slug-change redirect error handling** — the slug-history insert and the locale-paired `redirects` upsert were extracted from `app/(admin)/admin/(dashboard)/products/actions.ts` into the testable helpers `recordSlugChange` and `writeSlugRedirects` in `lib/admin/slug-rename-effects.ts`. Strategy chosen: **A (fail-and-surface)** — the product row commits; if either side effect fails the action returns `ok: false` with an explicit message telling the admin to retry (idempotent), and `logError` from `lib/observability.ts` forwards the error so Phase 4 Sentry wiring will pick it up. PII-free context (route, slug-old, slug-new, Postgres error code) only.
4. **Production DB fallback hardening** — `lib/data/products.ts` (`getProducts`, `getProductBySlug`, `getAllProductPaths`) and `lib/data/categories.ts` (`getCategories`, `getCategoryBySlug`) already had `NODE_ENV === "production"` branches that suppress the local-TS placeholder fallback; this task swapped their `console.error` calls for `logError` so the same Sentry wiring catches DB outages in production. Caller paths (PLP/PDP/category page/sitemap) already handle `[]` / `null` correctly via `notFound()` and empty grids — no caller changes needed.

### Tests added

Three new Vitest files, **17 new test cases** (test count: 290 → **307**):

- `lib/admin/slug-rename-effects.test.ts` — 6 tests: success path for both helpers (returns `ok: true`, builds correct rows, no log), failure path (returns explicit retry message, forwards to `logError` with PII-free context), category-move-with-slug-change shape, and a contract test asserting no PII leaks into the log context.
- `lib/data/products.test.ts` — 7 tests: production failure → empty/null + `logError`; development failure → local-TS fallback + `logError`; success path returns mapped rows. Covers all three exported query functions.
- `lib/data/categories.test.ts` — 4 tests: same matrix for `getCategories` and `getCategoryBySlug`.

To enable testing of `server-only`-marked modules outside the Next runtime, `vitest.config.ts` aliases `server-only` to a noop stub at `lib/test/server-only.ts`.

### Files modified

- `package.json` (engines field tightened)
- `.nvmrc` (already correct; verified)
- `README.md` (Prerequisites + Database workflow sections rewritten)
- `supabase/schema.sql` (warning header + runtime guard prepended)
- `app/(admin)/admin/(dashboard)/products/actions.ts` (extracted slug-rename side effects to helpers)
- `lib/admin/slug-rename-effects.ts` (new — extracted helpers)
- `lib/admin/slug-rename-effects.test.ts` (new)
- `lib/data/products.ts` (`console.error` → `logError`)
- `lib/data/products.test.ts` (new)
- `lib/data/categories.ts` (`console.error` → `logError`)
- `lib/data/categories.test.ts` (new)
- `lib/test/server-only.ts` (new — vitest alias target)
- `vitest.config.ts` (alias `server-only` → noop)
- `CHECKLIST.md` (4 new "Final pre-launch verification" items)
- `PROJECT_STATE.md` (this section)

### Deferred to Phase 4 Tasks 2–6

- **Task 2:** Wire `@sentry/nextjs`. Replace `logError`/`logEvent` bodies; configure `beforeSend` to enforce the no-PII contract.
- **Task 3:** Tighten `style-src` CSP to nonce-based once Next/shadcn no longer inject runtime styles.
- **Task 4:** Accessibility pass to AAA contrast + keyboard / focus order audit.
- **Task 5:** Dev/prod Supabase project split with branched preview deploys.
- **Task 6:** CI-on-PRs (lint + test + build + tsc + Lighthouse on a Vercel preview URL).

## Next session

**Phase 4 — Task 2** (Sentry wiring) is the natural next step: the `logError` plumbing landed in this task is now waiting for a real backend. After that, the remaining tasks are independent and can be sequenced by operator preference.
