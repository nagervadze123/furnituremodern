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
| **Phase 4** — Security AAA + observability + DX/CI | 🟡 Queued | See `CHECKLIST.md` "Phase 4 priorities". |
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

## Next session

**Phase 4** — Security AAA + observability + accessibility AAA + DX/CI-CD + dev/prod Supabase split. Concrete items in `CHECKLIST.md` "Phase 4 priorities".
