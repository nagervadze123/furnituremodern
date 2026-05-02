# Plan 3 — Consent Management + Analytics + RUM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary "accepted | declined" consent placeholder with a 2026-compliant granular system (necessary / analytics / marketing categories), wire first-party analytics + Real User Monitoring (web-vitals) behind that consent, and surface the resulting metrics on the admin dashboard.

**Architecture:** Consent state lives in BOTH a `fm_consent` cookie (1-year, SSR-readable) and localStorage (instant client reads). A new `lib/consent/` module replaces `components/cookie-consent.tsx`'s store while keeping a back-compat `useConsent()` export so existing callers (`Analytics`) only need a small touch-up. Two new Supabase tables — `analytics_event` and `web_vitals` — accept anon inserts via dedicated `/api/analytics` and `/api/vitals` route handlers. Captures are gated at the source: nothing fires without `consent.analytics === true`. The admin `/admin/seo` page gains three Web Vitals p75 cards (LCP, INP, CLS) over the last 7 days.

**Tech Stack:** Next.js 16.2.4, React 19, next-intl, Supabase, `web-vitals` npm, Zod (already installed), Vitest (already installed).

---

## Important Caveats (read before starting)

1. **Production database is live.** The migration is additive — `CREATE TABLE IF NOT EXISTS` for two new tables. Apply via Supabase MCP (`mcp__plugin_supabase_supabase__apply_migration`) or Studio's SQL editor. Never re-apply `supabase/schema.sql` to prod (it has destructive `DROP TABLE IF EXISTS`). Update `supabase/schema.sql` to stay canonical for fresh-DB setups.
2. **Existing consent surface is in use.** `components/cookie-consent.tsx` exports `useConsent()`, `getStoredConsent()`, `CookieConsent`, and `ConsentState`. `components/analytics.tsx` imports `useConsent`. Plan 3 keeps the same export NAMES but evolves the shape: `ConsentState` becomes a `{ analytics: boolean; marketing: boolean; updatedAt: string } | null` object. Update every caller in the same task.
3. **No third-party CMP.** Building a small first-party banner is cheaper, faster, and avoids loading another vendor JS bundle. The banner has to be GDPR/ePrivacy-shaped: "Reject non-essential" must be as prominent as "Accept all" (post-2024 EU enforcement). A "Customize" path opens the settings sheet for per-category toggles.
4. **First-party analytics, not Plausible.** The existing `components/analytics.tsx` had a Plausible placeholder. Plan 3 replaces that placeholder with our own page-view beacon hitting `/api/analytics`, which writes to Supabase. We pay zero monthly fees and the data stays in our DB. If the user wants Plausible/Vercel/PostHog later, swap the beacon target.
5. **Web Vitals package.** `web-vitals@4.x` is a tiny (~6KB gzip) library that captures CLS, INP, LCP, FCP, TTFB. We capture all five and store them with `path` + `locale` so the admin can filter.
6. **CSP impact.** The new endpoints are same-origin POSTs. The current `connect-src 'self'` already covers them, no policy change needed. Confirm in Task 12 before declaring done.
7. **Pragmatic TDD.** Vitest tests for `lib/consent/store.ts` (cookie/localStorage parsing, partial migration of legacy `"accepted"|"declined"` values) and the FNV-1a `hashIp` helper. UI surfaces (banner, sheet, settings link) get smoke-tested manually.
8. **Autopush is on** per `AGENTS.md`. Each task ends with a commit + push to `origin/main`. Vercel auto-deploys.
9. **No worktree.** Per the user's standing preference for this project.
10. **Token discipline.** Read only the files each task explicitly touches; do NOT scan the codebase end-to-end. The plan tells you exactly which files to open. Avoid loading non-essential MCP / plugin tools — Supabase MCP for the migration in Task 1 is the one exception. If a step seems to need broader context, ask the controller before pulling another file.

---

## File Structure

| Path | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/2026-05-02-analytics-rum.sql` | Create | Additive migration: `analytics_event` + `web_vitals` tables, indexes, RLS |
| `supabase/schema.sql` | Modify | Reflect the same changes for fresh-DB setups |
| `lib/supabase/database.types.ts` | Modify | Add the two new tables to the hand-written types |
| `lib/consent/types.ts` | Create | `ConsentChoice` type, default values, JSON shape |
| `lib/consent/store.ts` | Create | Cookie + localStorage hybrid, `readConsent()`, `writeConsent()`, `subscribeConsent()`, `useConsent()` hook, legacy migration |
| `lib/consent/store.test.ts` | Create | Unit tests for parsing, defaults, legacy migration |
| `components/cookie-consent.tsx` | Modify | Re-exports from `lib/consent` to preserve existing import paths |
| `components/consent/banner.tsx` | Create | First-visit banner; Accept all / Reject non-essential / Customize |
| `components/consent/settings-sheet.tsx` | Create | Granular toggle dialog; Save / Cancel |
| `components/consent/manage-link.tsx` | Create | Footer "Manage cookies" link that opens the settings sheet |
| `components/footer.tsx` | Modify | Insert the manage-cookies link |
| `components/analytics.tsx` | Modify | Read `consent.analytics`, replace placeholder with first-party beacon mount |
| `components/page-view-tracker.tsx` | Create | Client Component that beacons `/api/analytics` on every `pathname` change |
| `components/web-vitals-reporter.tsx` | Create | Client Component that subscribes to `web-vitals` and beacons `/api/vitals` |
| `app/api/analytics/route.ts` | Create | POST handler, Zod-validated payload, FNV-1a IP hash, insert |
| `app/api/vitals/route.ts` | Create | POST handler, Zod-validated payload, insert |
| `app/[locale]/privacy/page.tsx` | Create | Bilingual privacy policy page; manage-cookies link in body |
| `app/[locale]/layout.tsx` | Modify | Mount `<PageViewTracker>` and `<WebVitalsReporter>` next to `<Analytics>` |
| `app/(admin)/admin/(dashboard)/seo/page.tsx` | Modify | Add three p75 Web Vitals cards (LCP, INP, CLS) — last 7 days |
| `messages/ka.json` and `messages/en.json` | Modify | Add `consent.categories.*`, `consent.customize`, `consent.privacy`, `consent.manage`, footer label, privacy-page strings |

---

## Task 1: Database migration — `analytics_event` + `web_vitals`

**Files:**
- Create: `supabase/migrations/2026-05-02-analytics-rum.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Write the additive migration**

```sql
-- ---------------------------------------------------------------------------
-- 2026-05-02 — Analytics + RUM
-- ---------------------------------------------------------------------------
-- Apply with:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • or via the Supabase MCP apply_migration tool
--
-- All statements are idempotent so the migration can be re-run.
-- ---------------------------------------------------------------------------

-- 1. analytics_event — first-party event log.
CREATE TABLE IF NOT EXISTS public.analytics_event (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event        text NOT NULL,                -- e.g. "page_view", "product_view"
  path         text NOT NULL,                -- the URL pathname when fired
  locale       text NULL,                    -- "ka" / "en"
  referrer     text NULL,
  ip_hash      text NULL,                    -- FNV-1a 32-bit
  user_agent   text NULL,
  props        jsonb NOT NULL DEFAULT '{}',  -- arbitrary event-specific props
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_event_event_idx
  ON public.analytics_event (event);
CREATE INDEX IF NOT EXISTS analytics_event_path_idx
  ON public.analytics_event (path);
CREATE INDEX IF NOT EXISTS analytics_event_occurred_at_idx
  ON public.analytics_event (occurred_at DESC);

ALTER TABLE public.analytics_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_event_admin_select" ON public.analytics_event;
CREATE POLICY "analytics_event_admin_select"
ON public.analytics_event FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "analytics_event_anon_insert" ON public.analytics_event;
CREATE POLICY "analytics_event_anon_insert"
ON public.analytics_event FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_event_admin_delete" ON public.analytics_event;
CREATE POLICY "analytics_event_admin_delete"
ON public.analytics_event FOR DELETE
USING (private.is_admin());

-- 2. web_vitals — Real User Monitoring metrics.
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric       text NOT NULL CHECK (metric IN ('CLS','INP','LCP','FCP','TTFB')),
  value        numeric NOT NULL,             -- ms for time metrics, unitless for CLS
  rating       text NOT NULL CHECK (rating IN ('good','needs-improvement','poor')),
  path         text NOT NULL,
  locale       text NULL,
  navigation_type text NULL,                 -- "navigate" / "reload" / "back-forward"
  ip_hash      text NULL,
  user_agent   text NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_metric_idx
  ON public.web_vitals (metric);
CREATE INDEX IF NOT EXISTS web_vitals_path_idx
  ON public.web_vitals (path);
CREATE INDEX IF NOT EXISTS web_vitals_occurred_at_idx
  ON public.web_vitals (occurred_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_vitals_admin_select" ON public.web_vitals;
CREATE POLICY "web_vitals_admin_select"
ON public.web_vitals FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "web_vitals_anon_insert" ON public.web_vitals;
CREATE POLICY "web_vitals_anon_insert"
ON public.web_vitals FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "web_vitals_admin_delete" ON public.web_vitals;
CREATE POLICY "web_vitals_admin_delete"
ON public.web_vitals FOR DELETE
USING (private.is_admin());
```

- [ ] **Step 2: Apply the migration to production**

Either through Supabase MCP:
```
mcp__plugin_supabase_supabase__apply_migration
  project_id: muzzgmhovthhvuuzmqfz
  name: analytics_rum
  query: <body of the migration above, no comments needed>
```

Or via Studio's SQL editor. Confirm the two tables exist with `mcp__plugin_supabase_supabase__list_tables`.

- [ ] **Step 3: Update `supabase/schema.sql`**

Add to the top DROP block:
```sql
DROP TABLE IF EXISTS public.analytics_event       CASCADE;
DROP TABLE IF EXISTS public.web_vitals            CASCADE;
```

After the existing `not_found_log` block, insert the full table definitions (without `IF NOT EXISTS` and without `DROP POLICY IF EXISTS`), and append the policies in the RLS section at the bottom.

- [ ] **Step 4: Update `lib/supabase/database.types.ts`**

Add `analytics_event` and `web_vitals` table shapes to the `Tables` map. Mirror the `not_found_log` style:

```ts
analytics_event: {
  Row: {
    id: string;
    event: string;
    path: string;
    locale: string | null;
    referrer: string | null;
    ip_hash: string | null;
    user_agent: string | null;
    props: Record<string, unknown>;
    occurred_at: string;
  };
  Insert: {
    id?: string;
    event: string;
    path: string;
    locale?: string | null;
    referrer?: string | null;
    ip_hash?: string | null;
    user_agent?: string | null;
    props?: Record<string, unknown>;
    occurred_at?: string;
  };
  Update: Partial<
    Database["public"]["Tables"]["analytics_event"]["Insert"]
  >;
  Relationships: [];
};
web_vitals: {
  Row: {
    id: string;
    metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
    value: number;
    rating: "good" | "needs-improvement" | "poor";
    path: string;
    locale: string | null;
    navigation_type: string | null;
    ip_hash: string | null;
    user_agent: string | null;
    occurred_at: string;
  };
  Insert: {
    id?: string;
    metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
    value: number;
    rating: "good" | "needs-improvement" | "poor";
    path: string;
    locale?: string | null;
    navigation_type?: string | null;
    ip_hash?: string | null;
    user_agent?: string | null;
    occurred_at?: string;
  };
  Update: Partial<
    Database["public"]["Tables"]["web_vitals"]["Insert"]
  >;
  Relationships: [];
};
```

- [ ] **Step 5: Run typecheck and commit**

```bash
npx tsc --noEmit
```

```bash
git add supabase/migrations/ supabase/schema.sql lib/supabase/database.types.ts
git commit -m "Add schema migration for analytics + web vitals"
git push origin main
```

---

## Task 2: Consent core (`lib/consent/`)

**Files:**
- Create: `lib/consent/types.ts`
- Create: `lib/consent/store.ts`
- Create: `lib/consent/store.test.ts`

- [ ] **Step 1: `lib/consent/types.ts`**

```ts
// Granular consent state. "necessary" is implicit (always true) and
// not stored — the law treats strictly-necessary cookies as exempt
// from consent. We track only the categories the user can opt out of.
export type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  // ISO 8601 timestamp of the most recent decision; used to expire the
  // cookie after 12 months and prompt for re-consent.
  updatedAt: string;
};

export const CONSENT_DEFAULT_DECLINED: ConsentChoice = {
  analytics: false,
  marketing: false,
  updatedAt: "",
};

// Shown on the SSR snapshot — the server never decides for the user.
// `null` means undecided; the banner mounts on the client when it sees
// this and there's no stored value.
export type ConsentSnapshot = ConsentChoice | null;

export const CONSENT_COOKIE_NAME = "fm_consent";
export const CONSENT_STORAGE_KEY = "fm-consent";
// 12 months in seconds.
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
```

- [ ] **Step 2: Write the failing tests (`lib/consent/store.test.ts`)**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseStoredConsent,
  serializeConsent,
} from "./store";

describe("parseStoredConsent", () => {
  it("returns null for missing input", () => {
    expect(parseStoredConsent(null)).toBeNull();
    expect(parseStoredConsent(undefined)).toBeNull();
    expect(parseStoredConsent("")).toBeNull();
  });

  it("migrates the legacy 'accepted' string to all-true", () => {
    const out = parseStoredConsent("accepted");
    expect(out?.analytics).toBe(true);
    expect(out?.marketing).toBe(true);
    expect(out?.updatedAt).not.toBe("");
  });

  it("migrates the legacy 'declined' string to all-false", () => {
    const out = parseStoredConsent("declined");
    expect(out?.analytics).toBe(false);
    expect(out?.marketing).toBe(false);
    expect(out?.updatedAt).not.toBe("");
  });

  it("parses a well-formed JSON object", () => {
    const raw = JSON.stringify({
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-02T10:00:00.000Z",
    });
    expect(parseStoredConsent(raw)).toEqual({
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-02T10:00:00.000Z",
    });
  });

  it("rejects unknown shapes", () => {
    expect(parseStoredConsent("not-json")).toBeNull();
    expect(parseStoredConsent("{}")).toBeNull();
    expect(parseStoredConsent('{"analytics":"yes"}')).toBeNull();
  });

  it("treats analytics: undefined as false (defensive)", () => {
    const raw = JSON.stringify({ marketing: true, updatedAt: "x" });
    expect(parseStoredConsent(raw)).toBeNull();
  });
});

describe("serializeConsent", () => {
  it("round-trips through parseStoredConsent", () => {
    const choice = {
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-02T00:00:00.000Z",
    };
    expect(parseStoredConsent(serializeConsent(choice))).toEqual(choice);
  });
});
```

- [ ] **Step 3: Implement `lib/consent/store.ts`**

```ts
"use client";
// (the "use client" directive is fine — Server Components import
// `parseStoredConsent` and `serializeConsent` from this file via tree-
// shaking; Next.js doesn't enforce server/client purity for pure
// utility exports as long as they don't pull in browser-only APIs.)

import { useSyncExternalStore } from "react";
import type { ConsentChoice, ConsentSnapshot } from "./types";
import { CONSENT_STORAGE_KEY } from "./types";

const EVENT_NAME = "fm-consent-change";

// ---------------------------------------------------------------------------
// Pure parsing/serializing — exported for unit testing.
// ---------------------------------------------------------------------------

export function parseStoredConsent(raw: string | null | undefined): ConsentSnapshot {
  if (!raw) return null;

  // Legacy migration: pre-Plan-3 stored "accepted" or "declined".
  if (raw === "accepted") {
    return { analytics: true, marketing: true, updatedAt: new Date().toISOString() };
  }
  if (raw === "declined") {
    return { analytics: false, marketing: false, updatedAt: new Date().toISOString() };
  }

  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      obj &&
      typeof obj === "object" &&
      "analytics" in obj &&
      "marketing" in obj &&
      "updatedAt" in obj &&
      typeof (obj as ConsentChoice).analytics === "boolean" &&
      typeof (obj as ConsentChoice).marketing === "boolean" &&
      typeof (obj as ConsentChoice).updatedAt === "string"
    ) {
      return obj as ConsentChoice;
    }
  } catch {
    /* fallthrough */
  }
  return null;
}

export function serializeConsent(choice: ConsentChoice): string {
  return JSON.stringify(choice);
}

// ---------------------------------------------------------------------------
// Browser store — localStorage + window event subscription.
// ---------------------------------------------------------------------------

function readFromStorage(): ConsentSnapshot {
  if (typeof window === "undefined") return null;
  return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT_NAME, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT_NAME, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(
    subscribe,
    readFromStorage,
    () => null // server snapshot
  );
}

export function readConsent(): ConsentSnapshot {
  return readFromStorage();
}

export function writeConsent(choice: ConsentChoice): void {
  // Persist to localStorage for instant client reads.
  window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choice));
  // Mirror to a cookie so middleware / RSC can read consent on the next
  // request without a hydration flash. SameSite=Lax is fine — this is a
  // first-party cookie used by our own routes.
  document.cookie = `fm_consent=${encodeURIComponent(
    serializeConsent(choice)
  )}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax; Secure`;
  // Notify same-tab subscribers.
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: choice }));
}

export function clearConsent(): void {
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  document.cookie = "fm_consent=; Max-Age=0; Path=/; SameSite=Lax; Secure";
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
}
```

- [ ] **Step 4: Verify**

```bash
npm test
npx tsc --noEmit
npm run lint
```

All three must exit 0. `npm test` should now show 27+ tests (21 existing + 6 new for consent).

- [ ] **Step 5: Commit**

```bash
git add lib/consent/
git commit -m "Add granular consent core with legacy migration"
git push origin main
```

---

## Task 3: Consent banner + settings sheet

**Files:**
- Create: `components/consent/banner.tsx`
- Create: `components/consent/settings-sheet.tsx`
- Modify: `components/cookie-consent.tsx` — re-export shim
- Modify: `messages/ka.json`, `messages/en.json`

- [ ] **Step 1: Add localized strings**

Find the existing `consent` block in `messages/ka.json` and replace it with:

```json
"consent": {
  "title": "ჩვენ ვიყენებთ ქუქი-ფაილებს",
  "body": "სავალდებულო ფაილები ყოველთვის ჩართულია. გთხოვთ აირჩიოთ, ნებას აძლევთ თუ არა ანალიტიკურ და მარკეტინგულ ფაილებს.",
  "acceptAll": "ყველას მიღება",
  "rejectAll": "მხოლოდ სავალდებულო",
  "customize": "მართვა",
  "save": "შენახვა",
  "cancel": "გაუქმება",
  "manage": "ქუქი-ფაილების მართვა",
  "categories": {
    "necessary": {
      "label": "სავალდებულო",
      "description": "საიტის ბაზისური ფუნქციონირებისთვის. ყოველთვის ჩართულია."
    },
    "analytics": {
      "label": "ანალიტიკა",
      "description": "გვეხმარება გავიგოთ, როგორ იყენებენ ვიზიტორები საიტს. გროვდება ანონიმურად."
    },
    "marketing": {
      "label": "მარკეტინგი",
      "description": "გამოიყენება პერსონალიზებული შეთავაზებებისთვის. ამჟამად არ გამოიყენება."
    }
  },
  "privacyLink": "კონფიდენციალურობის პოლიტიკა"
}
```

In `messages/en.json`:

```json
"consent": {
  "title": "We use cookies",
  "body": "Necessary cookies are always on. Choose whether to allow analytics and marketing cookies.",
  "acceptAll": "Accept all",
  "rejectAll": "Necessary only",
  "customize": "Customize",
  "save": "Save",
  "cancel": "Cancel",
  "manage": "Manage cookies",
  "categories": {
    "necessary": {
      "label": "Necessary",
      "description": "Required for the site to work. Always on."
    },
    "analytics": {
      "label": "Analytics",
      "description": "Helps us understand how visitors use the site. Collected anonymously."
    },
    "marketing": {
      "label": "Marketing",
      "description": "Used for personalized offers. Not currently in use."
    }
  },
  "privacyLink": "Privacy Policy"
}
```

- [ ] **Step 2: `components/consent/banner.tsx`**

```tsx
"use client";

// First-visit consent banner. Footer-pinned. Shows three actions:
//   - Accept all  → analytics + marketing both true
//   - Necessary only → both false (explicit reject)
//   - Customize  → opens the settings sheet for granular control
//
// Stays hidden during SSR and after the user has decided. Hydration
// mismatch on the banner element is intentional — the server never
// renders it.

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useConsent, writeConsent } from "@/lib/consent/store";
import { SettingsSheet } from "./settings-sheet";

export function ConsentBanner() {
  const t = useTranslations("consent");
  const consent = useConsent();
  const [showSettings, setShowSettings] = useState(false);

  if (consent !== null) return null;

  const acceptAll = () =>
    writeConsent({
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    });

  const rejectAll = () =>
    writeConsent({
      analytics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    });

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label={t("title")}
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border bg-background p-4 shadow-lg sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex-1 text-sm">
            <p className="font-semibold">{t("title")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("body")}{" "}
              <Link href="/privacy" className="underline">
                {t("privacyLink")}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <Button variant="outline" size="sm" onClick={rejectAll}>
              {t("rejectAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              {t("customize")}
            </Button>
            <Button size="sm" onClick={acceptAll}>
              {t("acceptAll")}
            </Button>
          </div>
        </div>
      </div>
      {showSettings ? (
        <SettingsSheet onClose={() => setShowSettings(false)} />
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: `components/consent/settings-sheet.tsx`**

```tsx
"use client";

// Granular consent dialog. Three categories — necessary (always on,
// disabled toggle), analytics, marketing. Save persists to both
// cookie + localStorage via writeConsent(); Cancel closes without
// changes.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { writeConsent, readConsent } from "@/lib/consent/store";

type Props = {
  onClose: () => void;
};

export function SettingsSheet({ onClose }: Props) {
  const t = useTranslations("consent");
  const initial = readConsent();
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [marketing, setMarketing] = useState(initial?.marketing ?? false);

  const save = () => {
    writeConsent({
      analytics,
      marketing,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("customize")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{t("customize")}</h2>
        <ul className="mt-4 space-y-4">
          <Row
            label={t("categories.necessary.label")}
            description={t("categories.necessary.description")}
            checked
            disabled
            onChange={() => {}}
          />
          <Row
            label={t("categories.analytics.label")}
            description={t("categories.analytics.description")}
            checked={analytics}
            onChange={setAnalytics}
          />
          <Row
            label={t("categories.marketing.label")}
            description={t("categories.marketing.description")}
            checked={marketing}
            onChange={setMarketing}
          />
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={save}>
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={label}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Refactor `components/cookie-consent.tsx` into a re-export shim**

```tsx
// Back-compat shim. The real consent logic moved into lib/consent/.
// Existing imports (`@/components/cookie-consent`) continue to work
// so we don't have to chase every caller in the same diff.

export { useConsent } from "@/lib/consent/store";
export type { ConsentChoice as ConsentState } from "@/lib/consent/types";
export { ConsentBanner as CookieConsent } from "@/components/consent/banner";
```

- [ ] **Step 5: Verify build + smoke**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Boot dev (`npm run dev`), open an incognito tab, visit the site. Banner shows. Click "Necessary only" → banner disappears, no analytics fires. Reload → banner stays gone. Open DevTools → Application → Local Storage → `fm-consent` is `{"analytics":false,...}`. Cookies → `fm_consent` mirrors it.

- [ ] **Step 6: Commit**

```bash
git add components/consent/ components/cookie-consent.tsx messages/
git commit -m "Replace binary banner with granular consent surface"
git push origin main
```

---

## Task 4: Privacy policy page + manage-cookies link

**Files:**
- Create: `app/[locale]/privacy/page.tsx`
- Create: `components/consent/manage-link.tsx`
- Modify: `components/footer.tsx` — insert the manage link
- Modify: `messages/ka.json`, `messages/en.json` — add privacy-page keys

- [ ] **Step 1: Add page-content strings**

Append to the `consent` block in both message files (or use a separate `privacy` block — pick whichever fits the existing convention). Suggested keys: `privacy.title`, `privacy.intro`, `privacy.dataCollected`, `privacy.thirdParties`, `privacy.contact`. Content can be placeholder; legal review is out of scope.

- [ ] **Step 2: `app/[locale]/privacy/page.tsx`**

A bilingual Server Component using `getTranslations("privacy")`. Render the page in a single column with prose styling consistent with the rest of the site. Include a "Manage cookies" CTA near the bottom that opens the settings sheet — implemented via `<ManageCookiesLink />` from Step 3.

- [ ] **Step 3: `components/consent/manage-link.tsx`**

```tsx
"use client";

// Footer / privacy-page CTA that re-opens the consent settings sheet
// after the user has already chosen. Renders as a plain text button
// styled like a link.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SettingsSheet } from "./settings-sheet";

export function ManageCookiesLink({
  className = "underline hover:opacity-80",
}: {
  className?: string;
}) {
  const t = useTranslations("consent");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {t("manage")}
      </button>
      {open ? <SettingsSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
```

- [ ] **Step 4: Wire into the footer**

Find the footer's link list (probably in `components/footer.tsx`). Add a `<ManageCookiesLink />` alongside the existing footer links.

- [ ] **Step 5: Smoke + commit**

`npm run dev`, visit any page, scroll to footer, click Manage cookies → settings sheet opens. Toggle marketing → Save → reload → toggle is remembered. Visit `/ka/privacy` and `/en/privacy` to confirm both render.

```bash
git add 'app/[locale]/privacy/' components/consent/manage-link.tsx \
        components/footer.tsx messages/
git commit -m "Add privacy policy page and manage-cookies footer link"
git push origin main
```

---

## Task 5: First-party page-view tracking

**Files:**
- Create: `components/page-view-tracker.tsx`
- Modify: `components/analytics.tsx` — replace placeholder with tracker mount
- Modify: `app/[locale]/layout.tsx` — already mounts `<Analytics>`, no change expected

- [ ] **Step 1: Create the tracker component**

```tsx
"use client";

// Beacons /api/analytics on every pathname change once the visitor
// has consented to analytics. Uses `keepalive: true` so the request
// survives navigation. Skips bot traffic via a simple navigator check
// — bots usually don't run JS, so this is a defense-in-depth filter.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/lib/consent/store";

export function PageViewTracker() {
  const pathname = usePathname();
  const consent = useConsent();

  useEffect(() => {
    if (!consent?.analytics) return;
    if (typeof navigator === "undefined") return;
    // Best-effort bot filter; not a perfect signal but cheap.
    if (/bot|crawl|spider|headless/i.test(navigator.userAgent)) return;

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page_view",
        path: pathname,
        locale: pathname.split("/")[1] || null,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, consent?.analytics]);

  return null;
}
```

- [ ] **Step 2: Update `components/analytics.tsx`**

Replace the file body with:

```tsx
"use client";

// First-party analytics surface. Renders the page-view tracker only
// after the visitor has consented to analytics. The Vercel/Plausible
// placeholder script is gone; we beacon directly to /api/analytics
// which writes to Supabase.

import { useConsent } from "@/lib/consent/store";
import { PageViewTracker } from "./page-view-tracker";

type AnalyticsProps = {
  // CSP nonce reserved for future inline scripts; unused while we
  // beacon via fetch().
  nonce?: string;
};

export function Analytics(_props: AnalyticsProps) {
  const consent = useConsent();
  if (!consent?.analytics) return null;
  return <PageViewTracker />;
}
```

- [ ] **Step 3: Verify**

Boot dev. Open DevTools Network tab. Visit a few pages. Without consent, nothing fires. Open the manage-cookies sheet, enable analytics, save. Now navigation produces `POST /api/analytics` requests with `event: "page_view"` payloads. (The endpoint doesn't exist yet — it lands in Task 6, so requests 404 for now. That's expected.)

- [ ] **Step 4: Commit**

```bash
git add components/page-view-tracker.tsx components/analytics.tsx
git commit -m "Beacon page views to /api/analytics behind consent"
git push origin main
```

---

## Task 6: `/api/analytics` route handler

**Files:**
- Create: `app/api/analytics/route.ts`
- Create: `lib/analytics/hash-ip.ts` (shared with vitals)
- Create: `lib/analytics/hash-ip.test.ts`

- [ ] **Step 1: Pure IP-hash helper with tests**

```ts
// lib/analytics/hash-ip.ts
//
// FNV-1a 32-bit hash of an IP string. Lets us group repeated visits
// from the same source without storing the IP itself. Pure function
// — runs anywhere.

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}
```

```ts
// lib/analytics/hash-ip.test.ts
import { describe, it, expect } from "vitest";
import { hashIp } from "./hash-ip";

describe("hashIp", () => {
  it("returns null for null/empty input", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp("")).toBeNull();
  });
  it("is deterministic", () => {
    expect(hashIp("192.0.2.1")).toBe(hashIp("192.0.2.1"));
  });
  it("differs between distinct IPs", () => {
    expect(hashIp("192.0.2.1")).not.toBe(hashIp("192.0.2.2"));
  });
  it("is short", () => {
    const out = hashIp("203.0.113.42");
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(8);
  });
});
```

(Refactor `app/api/log-404/route.ts` to import from this module too — drop the inline copy.)

- [ ] **Step 2: `app/api/analytics/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/analytics/hash-ip";

// Beacon endpoint hit by <PageViewTracker /> and any future first-
// party event tracker. Validation is lenient because the payload
// comes from the public web — we just refuse anything malformed.

const PayloadSchema = z.object({
  event: z.string().min(1).max(64),
  path: z.string().min(1).max(2048),
  locale: z.string().max(8).nullable().optional(),
  referrer: z.string().max(2048).nullable().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

  const supabase = createSupabaseAdminClient();
  await supabase.from("analytics_event").insert({
    event: parsed.data.event,
    path: parsed.data.path,
    locale: parsed.data.locale ?? null,
    referrer: parsed.data.referrer ?? null,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
    props: parsed.data.props ?? {},
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify**

Boot dev. With analytics consent enabled, navigate. `analytics_event` rows appear in Supabase (verify via MCP `execute_sql`).

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/ app/api/log-404/ lib/analytics/
git commit -m "Add /api/analytics + shared FNV-1a IP hash helper"
git push origin main
```

---

## Task 7: Web Vitals capture

**Files:**
- Modify: `package.json` — add `web-vitals` dependency
- Create: `components/web-vitals-reporter.tsx`
- Modify: `app/[locale]/layout.tsx` — mount the reporter

- [ ] **Step 1: Install**

```bash
npm install web-vitals
```

- [ ] **Step 2: `components/web-vitals-reporter.tsx`**

```tsx
"use client";

// Subscribes to the five Core Web Vitals via the web-vitals npm
// package and beacons each measurement to /api/vitals once consent
// is granted for analytics. Each metric fires once per page load
// (CLS keeps updating until the user backgrounds the tab).

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { useConsent } from "@/lib/consent/store";

export function WebVitalsReporter() {
  const consent = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (!consent?.analytics) return;

    const send = (metric: Metric) => {
      void fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          path: pathname,
          locale: pathname.split("/")[1] || null,
          navigation_type: metric.navigationType,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    onCLS(send);
    onINP(send);
    onLCP(send);
    onFCP(send);
    onTTFB(send);
  }, [consent?.analytics, pathname]);

  return null;
}
```

- [ ] **Step 3: Mount in `app/[locale]/layout.tsx`**

Find the existing `<Analytics />` mount and add `<WebVitalsReporter />` next to it. Both gate internally on consent so neither fires for declined visitors.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```

Build should succeed. (The `/api/vitals` endpoint lands in Task 8, so live POSTs 404 until then.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/web-vitals-reporter.tsx \
        'app/[locale]/layout.tsx'
git commit -m "Capture Core Web Vitals client-side behind consent"
git push origin main
```

---

## Task 8: `/api/vitals` route handler

**Files:**
- Create: `app/api/vitals/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/analytics/hash-ip";

const PayloadSchema = z.object({
  metric: z.enum(["CLS", "INP", "LCP", "FCP", "TTFB"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  path: z.string().min(1).max(2048),
  locale: z.string().max(8).nullable().optional(),
  navigation_type: z.string().max(32).nullable().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

  const supabase = createSupabaseAdminClient();
  await supabase.from("web_vitals").insert({
    metric: parsed.data.metric,
    value: parsed.data.value,
    rating: parsed.data.rating,
    path: parsed.data.path,
    locale: parsed.data.locale ?? null,
    navigation_type: parsed.data.navigation_type ?? null,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify + commit**

Boot dev. With analytics consent on, navigate. After ~5 seconds (web-vitals reports CLS on page-hide), check `web_vitals` in Supabase — rows appear.

```bash
git add app/api/vitals/
git commit -m "Add /api/vitals handler for Web Vitals beacons"
git push origin main
```

---

## Task 9: CSP audit

**Files:**
- Modify (only if needed): `lib/security/csp.ts`

- [ ] **Step 1: Confirm `connect-src` already covers same-origin POSTs**

Read `lib/security/csp.ts`. The current policy should include `connect-src 'self' <supabase>`. The two new endpoints (`/api/analytics`, `/api/vitals`) are same-origin, so `'self'` already covers them. No change needed unless the policy excludes them.

- [ ] **Step 2: Verify in browser**

`npm run build && npm start`. With analytics consent on, navigate. Check DevTools Console → no CSP violations. Check Network → POST requests to both endpoints succeed.

- [ ] **Step 3: Commit (only if changes were needed)**

If `csp.ts` had to be touched:
```bash
git add lib/security/csp.ts
git commit -m "Allow same-origin analytics + vitals endpoints in CSP"
git push origin main
```

Otherwise mark this task done with no commit.

---

## Task 10: Web Vitals cards on `/admin/seo`

**Files:**
- Modify: `app/(admin)/admin/(dashboard)/seo/page.tsx`

- [ ] **Step 1: Query p75 of LCP, INP, CLS over the last 7 days**

Add to the `Promise.all` block in the SEO page:

```ts
const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

// Use a SQL helper in supabase via .rpc would be ideal; pragmatic
// path is to fetch raw values and percentile in JS for now. 1000 rows
// is fine; if traffic exceeds that we move to a SQL view.
supabase
  .from("web_vitals")
  .select("metric, value")
  .gte("occurred_at", sevenDaysAgo)
  .in("metric", ["LCP", "INP", "CLS"])
  .limit(1000),
```

In JS:

```ts
function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.75 * (sorted.length - 1));
  return sorted[idx];
}

const byMetric = new Map<string, number[]>();
for (const row of webVitalsRecent.data ?? []) {
  const arr = byMetric.get(row.metric) ?? [];
  arr.push(Number(row.value));
  byMetric.set(row.metric, arr);
}
const lcpP75 = p75(byMetric.get("LCP") ?? []);
const inpP75 = p75(byMetric.get("INP") ?? []);
const clsP75 = p75(byMetric.get("CLS") ?? []);
```

- [ ] **Step 2: Render three cards in a separate "Web Vitals (p75, last 7d)" section**

Format:
- LCP: `${value.toFixed(0)}ms` with green/amber/red color based on Core Web Vitals thresholds (LCP ≤ 2500ms good, ≤ 4000ms needs-improvement, > 4000ms poor)
- INP: same pattern (≤ 200ms good, ≤ 500ms needs-improvement, > 500ms poor)
- CLS: 3-decimal value (≤ 0.1 good, ≤ 0.25 needs-improvement, > 0.25 poor)

Render `—` when there's no data yet.

- [ ] **Step 3: Verify + commit**

`npm run dev`, log in to `/admin`. With at least one analytics-consented visit on record, the three cards render with real numbers.

```bash
git add 'app/(admin)/admin/(dashboard)/seo/page.tsx'
git commit -m "Add Web Vitals p75 cards to SEO dashboard"
git push origin main
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full check**

```bash
cd /home/moonpatrick/furnituremodern
npm test          # all unit tests pass (transliterate, slug-conflicts, slug, consent, hash-ip)
npx tsc --noEmit  # exit 0
npm run lint      # exit 0
npm run build     # exit 0
```

- [ ] **Step 2: Manual smoke walk-through**

Run `npm start`. In an incognito window:

1. Land on the home page — banner shows.
2. Click "Necessary only" — banner disappears, navigate around — confirm zero `analytics_event` and `web_vitals` inserts in Supabase.
3. Open footer → Manage cookies → enable Analytics → Save.
4. Navigate two more pages — confirm `analytics_event` rows for each path with `event: "page_view"`.
5. Wait ~5 seconds, then close the tab — `web_vitals` rows for CLS / LCP / INP appear shortly after.
6. Visit `/ka/privacy` and `/en/privacy` — both render with the manage-cookies CTA.
7. Open `/admin/seo` — the Web Vitals cards show real p75 values.
8. Toggle marketing on — saved; re-open settings — toggle persists.
9. Toggle analytics off — re-navigate — no new beacons fire.

- [ ] **Step 3: Final commit only if needed**

If the smoke walk surfaced fixes, commit them. Otherwise no commit required.

---

## Verification Gate (Plan 3 done when all of these pass)

- [ ] `npm test` → all unit tests pass.
- [ ] `npx tsc --noEmit` → exit 0.
- [ ] `npm run lint` → 0 issues.
- [ ] `npm run build` → 0 errors.
- [ ] First-visit banner shows three actions: Accept all / Necessary only / Customize.
- [ ] "Necessary only" persists `{ analytics: false, marketing: false }` to both cookie and localStorage.
- [ ] Customize → settings sheet → toggle granular → Save persists per-category state.
- [ ] Privacy policy page renders in both locales with a manage-cookies link.
- [ ] Footer manage-cookies link reopens the settings sheet.
- [ ] With analytics consent OFF, no `/api/analytics` or `/api/vitals` requests fire.
- [ ] With analytics consent ON, every navigation produces a `page_view` event in `analytics_event`.
- [ ] With analytics consent ON, page hide produces `web_vitals` rows for CLS/LCP/INP within ~10 seconds.
- [ ] `/admin/seo` shows Web Vitals p75 cards (LCP / INP / CLS) for the last 7 days, color-coded by Core Web Vitals thresholds.
- [ ] CSP report shows zero violations with both endpoints active.

When the gate passes, Plan 3 is complete. Plans 4 (SEO + AEO + Branded OG) and 5 (Performance + Mobile + PWA + Errors + Docs) follow.
