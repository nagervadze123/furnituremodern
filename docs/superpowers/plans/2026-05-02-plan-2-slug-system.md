# Plan 2 — Slug System Production-Grade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing string-only slug helper into a production-grade slug system: BGN/PCGN 1981 Georgian-to-Latin transliteration, append-only slug history, conflict detection with Georgian admin errors, soft-delete with 301-or-410 choice, a `not_found_log` for 404 telemetry, and an `/admin/seo` audit dashboard.

**Architecture:** Extend, don't restructure. Three new tables (`product_slug_history`, `not_found_log`, `gone_paths`-equivalent — see Task 3), one new column (`products.deleted_at`), one new pure-function module (`lib/slug/transliterate.ts`), one new helper (`lib/admin/slug-conflicts.ts`), one new admin page (`app/(admin)/admin/(dashboard)/seo/`), and edits to the existing product server actions to wire everything in. Vitest is added in Task 1 because transliteration and conflict detection have edge cases worth pinning down with unit tests; UI flows stay smoke-tested.

**Tech Stack:** Next.js 16.2.4, Supabase Postgres + RLS via `private.is_admin()`, Zod, next-intl, Vitest (new this plan).

---

## Important Caveats (read before starting)

1. **Production database is live.** Do NOT re-apply `supabase/schema.sql` against the production project — it has `DROP TABLE IF EXISTS ... CASCADE` at the top and would erase all data. Plan 2 ships an additive migration file (`supabase/migrations/2026-05-02-slug-system.sql`) that ALTERs / CREATEs idempotently and can be applied to the live DB without data loss. `supabase/schema.sql` is also updated so it stays canonical for fresh-DB setups.
2. **`lib/slug.ts` stays put.** The existing `slugify()` is still used by some callers; we add `lib/slug/transliterate.ts` alongside and have `slugify()` route Georgian input through it. Removing the old export would break callers we'd have to chase.
3. **404 logging is moved to the `not-found` boundary, not `proxy.ts`.** The Phase 3 spec said "log unmatched paths from proxy.ts middleware". Doing that requires a DB lookup on every request to decide "is this a real route?" — which would 10×-20× the proxy's per-request cost and dwarf the page render itself. Logging from `app/[locale]/not-found.tsx` (and a parallel route handler) gives the same data with a single insert per actual 404, runs only on cache misses, and avoids touching the hot path. The `not_found_log` table and `/admin/seo` 404s view land in this plan; the branded 404 page is Plan 5 — for now we'll add a minimal `not-found.tsx` so the logging beacon has a host. The user has been informed and accepted this deviation.
4. **The 410 Gone choice uses the existing `redirects` table.** We add `410` to the `status_code` CHECK constraint. The proxy's existing redirect lookup branches on status: `301/302/307/308` → redirect, `410` → rewrite to `/_gone` with HTTP status 410. No new table needed.
5. **Pragmatic TDD.** Vitest tests for the two areas with real edge cases — `transliterate.ts` (Georgian alphabet coverage, length cap, mixed-script input) and `slug-conflicts.ts` (published-product collision, redirect-path collision, locale awareness). UI surfaces (live preview, admin SEO dashboard, soft-delete option) are smoke-tested. Do not write unit tests for server actions that thinly wrap Supabase calls — the value isn't there.
6. **Autopush is on** per `AGENTS.md`. Each task ends with a commit and push to `origin/main`. Vercel auto-deploys.
7. **No worktree.** Per the user's standing preference for this project.

---

## File Structure

| Path | Action | Responsibility |
|------|--------|----------------|
| `vitest.config.ts` | Create | Vitest config — path aliases match `tsconfig.json`, environment `node` |
| `package.json` | Modify | Add `vitest`, `@vitest/coverage-v8` devDeps; add `test` and `test:watch` scripts |
| `lib/slug/transliterate.ts` | Create | Pure function `transliterate(input: string): string` implementing BGN/PCGN 1981. Importable from Client and Server Components. |
| `lib/slug/transliterate.test.ts` | Create | Vitest unit tests — Georgian alphabet, length cap, mixed-script, idempotence, trailing-hyphen dedup |
| `lib/slug.ts` | Modify | `slugify()` calls `transliterate()` for non-ASCII input; ASCII path unchanged |
| `lib/admin/slug-conflicts.ts` | Create | `detectSlugConflicts({ supabase, slug, categorySlug, excludeProductId })` returns `{ ok: true } \| { ok: false, code, message_ka }` |
| `lib/admin/slug-conflicts.test.ts` | Create | Mock Supabase client, assert published-product collision and redirects-path collision |
| `lib/admin/schemas.ts` | Modify | Add Georgian Zod messages for `slug` failures (existing English messages stay for English-only fields) |
| `supabase/migrations/2026-05-02-slug-system.sql` | Create | Additive migration: `product_slug_history` + `not_found_log` tables, `products.deleted_at` column, `redirects.status_code` CHECK extended to allow `410`, RLS policies |
| `supabase/schema.sql` | Modify | Reflect the same changes so a fresh DB matches |
| `lib/supabase/database.types.ts` | Modify | Regenerate types after migration is applied |
| `app/(admin)/admin/(dashboard)/products/actions.ts` | Modify | (a) Call conflict detection before insert/update with Georgian error surfacing; (b) Insert into `product_slug_history` on slug change; (c) Replace `delete` with soft-delete + redirect-or-410 choice |
| `app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx` | Modify | Add soft-delete dropdown ("Redirect to category" / "Mark as gone") next to delete button |
| `app/(admin)/admin/(dashboard)/products/new/page.tsx` and edit page | Modify | Live slug preview component beside the slug input |
| `components/admin/slug-preview.tsx` | Create | Client Component reading `name_ka`/`name_en` and showing the would-be slug |
| `app/[locale]/_gone/route.ts` | Create | Route Handler returning `new NextResponse(html, { status: 410 })` with a branded "Gone" page in the active locale |
| `proxy.ts` | Modify | Branch the existing redirect lookup: `status_code === 410` → rewrite to `/_gone`. Existing 30x behavior unchanged. |
| `lib/data/products.ts` | Modify | All read queries gain `.is("deleted_at", null)` so soft-deleted rows never reach the public site |
| `app/api/log-404/route.ts` | Create | POST handler accepting `{ path, locale, referrer }` from the not-found beacon; inserts into `not_found_log` with hashed IP |
| `app/[locale]/not-found.tsx` | Create | Minimal not-found that fires the beacon and returns 404. Plan 5 will rebrand. |
| `app/(admin)/admin/(dashboard)/seo/page.tsx` | Create | `/admin/seo` dashboard. Cards (totals + missing-content counts), redirects table, 404s table with quick-redirect, orphan slugs table with cleanup. |
| `app/(admin)/admin/(dashboard)/seo/actions.ts` | Create | Server actions: `createRedirectFrom404`, `cleanupOrphanSlug`. Existing redirect-delete action is reused. |
| `messages/ka.json` and `messages/en.json` | Modify | Add admin SEO labels (Georgian + English) and Georgian conflict-error strings |

---

## Task 1: Add Vitest test framework

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

Run from `/home/moonpatrick/furnituremodern`:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

- [ ] **Step 2: Add `test` and `test:watch` scripts to `package.json`**

Edit the `scripts` block to add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Smoke-test the runner**

Create `lib/_vitest-smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest is wired up", () => {
  it("runs a trivial test", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test passes.

Delete `lib/_vitest-smoke.test.ts` after confirming.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add Vitest for unit testing"
git push origin main
```

---

## Task 2: Implement BGN/PCGN 1981 transliteration

**Files:**
- Create: `lib/slug/transliterate.ts`
- Create: `lib/slug/transliterate.test.ts`
- Modify: `lib/slug.ts`

- [ ] **Step 1: Write the failing tests first (`lib/slug/transliterate.test.ts`)**

Tests cover the BGN/PCGN 1981 mappings the spec requires. The 33 modern Georgian letters map to:

| Letter | Latin | Letter | Latin | Letter | Latin |
|---|---|---|---|---|---|
| ა | a | კ | k' | ჟ | zh |
| ბ | b | ლ | l | რ | r |
| გ | g | მ | m | ს | s |
| დ | d | ნ | n | ტ | t' |
| ე | e | ო | o | უ | u |
| ვ | v | პ | p' | ფ | p |
| ზ | z | ჟ | zh | ქ | k |
| თ | t | რ | r | ღ | gh |
| ი | i | ს | s | ყ | q' |
| ე | e | შ | sh | ც | ts |
| | | ჩ | ch | ძ | dz |
| | | წ | ts' | ჭ | ch' |
| | | ხ | kh | ჯ | j |
| | | | | ჰ | h |

For slug use the apostrophes in `k'`, `t'`, `p'`, `q'`, `ts'`, `ch'` are dropped (BGN/PCGN distinguishes ejective consonants with apostrophes; for URL slugs we collapse to the base letter so `კატა` → `kata`, not `k'ata`).

```ts
import { describe, it, expect } from "vitest";
import { transliterate } from "./transliterate";

describe("transliterate (BGN/PCGN 1981, slug-mode)", () => {
  it("maps every modern Georgian letter", () => {
    const georgian = "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
    expect(transliterate(georgian)).toBe(
      "abgdevztiklmnopzhrstupkghqshchtsdztskhjh"
    );
  });

  it("lowercases ASCII alongside Georgian", () => {
    expect(transliterate("ლინენი Sofa 3")).toBe("lineni-sofa-3");
  });

  it("collapses non-alphanumeric runs to single hyphens", () => {
    expect(transliterate("სამ – ადგილიანი დივანი!")).toBe("sam-adgiliani-divani");
  });

  it("trims leading and trailing hyphens", () => {
    expect(transliterate("---სავარძელი---")).toBe("savardzeli");
  });

  it("dedupes adjacent hyphens", () => {
    expect(transliterate("a -- b -- c")).toBe("a-b-c");
  });

  it("caps length at 80 characters and trims trailing hyphen if cap lands mid-word", () => {
    const long = "სავარძელი".repeat(20);
    const result = transliterate(long);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("-")).toBe(false);
  });

  it("returns empty string for input with no convertible characters", () => {
    expect(transliterate("...!!!")).toBe("");
    expect(transliterate("")).toBe("")
  });

  it("is idempotent for already-ASCII slugs", () => {
    expect(transliterate("linen-three-seater")).toBe("linen-three-seater");
  });

  it("handles mixed Georgian + Latin + digits", () => {
    expect(transliterate("ლინენი sofa 2024")).toBe("lineni-sofa-2024");
  });

  it("strips non-Georgian non-ASCII (e.g., Russian)", () => {
    expect(transliterate("Диван linen")).toBe("linen");
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test
```

Expected: every assertion in the new file fails because `transliterate.ts` doesn't exist yet.

- [ ] **Step 3: Implement `lib/slug/transliterate.ts`**

```ts
// lib/slug/transliterate.ts
//
// Georgian → ASCII slug transliteration based on the BGN/PCGN 1981
// romanization scheme, adapted for URL slugs:
//   - drop the apostrophes BGN/PCGN uses to mark ejectives
//     (k', t', p', q', ts', ch') because they're URL-hostile
//   - lowercase everything
//   - collapse non-alphanumeric runs to single hyphens
//   - trim leading/trailing hyphens
//   - cap length at 80 chars, then re-trim a trailing hyphen if the
//     cap split the slug mid-word
//
// Pure function — works in Edge runtime, browser, and Node. No I/O.

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: "a",
  ბ: "b",
  გ: "g",
  დ: "d",
  ე: "e",
  ვ: "v",
  ზ: "z",
  თ: "t",
  ი: "i",
  კ: "k", // BGN/PCGN: k' — apostrophe dropped for slugs
  ლ: "l",
  მ: "m",
  ნ: "n",
  ო: "o",
  პ: "p", // BGN/PCGN: p' — apostrophe dropped
  ჟ: "zh",
  რ: "r",
  ს: "s",
  ტ: "t", // BGN/PCGN: t' — apostrophe dropped
  უ: "u",
  ფ: "p",
  ქ: "k",
  ღ: "gh",
  ყ: "q", // BGN/PCGN: q' — apostrophe dropped
  შ: "sh",
  ჩ: "ch",
  ც: "ts",
  ძ: "dz",
  წ: "ts", // BGN/PCGN: ts' — apostrophe dropped (collides with ც, OK for slugs)
  ჭ: "ch", // BGN/PCGN: ch' — apostrophe dropped (collides with ჩ, OK for slugs)
  ხ: "kh",
  ჯ: "j",
  ჰ: "h",
};

const MAX_SLUG_LENGTH = 80;

export function transliterate(input: string): string {
  if (!input) return "";

  // Pass 1: walk character-by-character, mapping Georgian letters to
  // Latin and dropping anything that isn't ASCII alphanumeric or a
  // separator we can later normalize.
  let buffer = "";
  for (const char of input.toLowerCase()) {
    const mapped = GEORGIAN_TO_LATIN[char];
    if (mapped !== undefined) {
      buffer += mapped;
    } else if (/[a-z0-9]/.test(char)) {
      buffer += char;
    } else {
      buffer += "-";
    }
  }

  // Pass 2: collapse runs of hyphens and trim.
  buffer = buffer.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  // Pass 3: enforce the 80-char cap, then re-trim a trailing hyphen
  // in case the cap landed mid-word.
  if (buffer.length > MAX_SLUG_LENGTH) {
    buffer = buffer.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }

  return buffer;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test
```

Expected: all 9 transliterate tests pass.

If any fail, fix the implementation, not the tests.

- [ ] **Step 5: Update `lib/slug.ts` to call `transliterate()` for non-ASCII input**

Replace the file body with:

```ts
import { transliterate } from "./slug/transliterate";

const ASCII_LETTERS_DIGITS = /^[\x00-\x7F]+$/;

/**
 * Generate a slug from an arbitrary string.
 *
 * - For Georgian or mixed-script input, delegates to BGN/PCGN
 *   transliteration in lib/slug/transliterate.ts.
 * - For pure-ASCII input keeps the old fast path: lowercase, strip
 *   diacritics, collapse non-alphanumerics to hyphens, trim, cap at 80.
 */
export function slugify(input: string): string {
  if (!input) return "";
  if (!ASCII_LETTERS_DIGITS.test(input)) {
    return transliterate(input);
  }
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Quick check used by Zod refinements. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
```

- [ ] **Step 6: Verify the build still passes**

```bash
npx tsc --noEmit
npm test
```

Both should exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/slug.ts lib/slug/
git commit -m "Add BGN/PCGN 1981 Georgian slug transliteration"
git push origin main
```

---

## Task 3: Database migration — slug history, soft delete, 404 log, 410

**Files:**
- Create: `supabase/migrations/2026-05-02-slug-system.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Write the additive migration `supabase/migrations/2026-05-02-slug-system.sql`**

```sql
-- ---------------------------------------------------------------------------
-- 2026-05-02 — Slug system production-grade
-- ---------------------------------------------------------------------------
-- Apply with one of:
--   • Supabase Studio → SQL editor → paste this file → Run
--   • psql "$DATABASE_URL" -f supabase/migrations/2026-05-02-slug-system.sql
--
-- Every statement is idempotent so the migration can be re-run.
-- ---------------------------------------------------------------------------

-- 1. products.deleted_at  (soft delete)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS products_deleted_at_idx
  ON public.products (deleted_at)
  WHERE deleted_at IS NULL;

-- 2. redirects: allow 410 status_code
ALTER TABLE public.redirects DROP CONSTRAINT IF EXISTS redirects_status_code_check;
ALTER TABLE public.redirects
  ADD CONSTRAINT redirects_status_code_check
  CHECK (status_code IN (301, 302, 307, 308, 410));

-- 3. product_slug_history
CREATE TABLE IF NOT EXISTS public.product_slug_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_slug    text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS product_slug_history_product_id_idx
  ON public.product_slug_history (product_id);

CREATE INDEX IF NOT EXISTS product_slug_history_changed_at_idx
  ON public.product_slug_history (changed_at DESC);

ALTER TABLE public.product_slug_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_slug_history_admin_select" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_select"
ON public.product_slug_history FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "product_slug_history_admin_insert" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_insert"
ON public.product_slug_history FOR INSERT
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "product_slug_history_admin_delete" ON public.product_slug_history;
CREATE POLICY "product_slug_history_admin_delete"
ON public.product_slug_history FOR DELETE
USING (private.is_admin());
-- No public read; the dashboard queries via the service-role admin client.
-- No update policy — history rows are immutable after insert.

-- 4. not_found_log
CREATE TABLE IF NOT EXISTS public.not_found_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path         text NOT NULL,
  locale       text NULL,
  referrer     text NULL,
  ip_hash      text NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS not_found_log_path_idx
  ON public.not_found_log (path);

CREATE INDEX IF NOT EXISTS not_found_log_occurred_at_idx
  ON public.not_found_log (occurred_at DESC);

ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "not_found_log_admin_select" ON public.not_found_log;
CREATE POLICY "not_found_log_admin_select"
ON public.not_found_log FOR SELECT
USING (private.is_admin());

DROP POLICY IF EXISTS "not_found_log_anon_insert" ON public.not_found_log;
CREATE POLICY "not_found_log_anon_insert"
ON public.not_found_log FOR INSERT
WITH CHECK (true);
-- Anon insert is intentional: the /api/log-404 route writes via the
-- server client (service role) but if anon SELECT were ever needed
-- that's where the lockdown lives. Keep insert open so the API route
-- doesn't need elevated keys; the route hashes the IP before insert.

DROP POLICY IF EXISTS "not_found_log_admin_delete" ON public.not_found_log;
CREATE POLICY "not_found_log_admin_delete"
ON public.not_found_log FOR DELETE
USING (private.is_admin());
```

- [ ] **Step 2: Apply the migration to your Supabase project**

This is a one-shot operation against the live DB. Use Supabase Studio → SQL Editor → paste → Run, OR `psql "$DATABASE_URL" -f supabase/migrations/2026-05-02-slug-system.sql`. Confirm in the Studio table editor that all three new objects exist:
- `products.deleted_at` column
- `product_slug_history` table
- `not_found_log` table

If anything fails, screenshot the error and STOP — don't proceed; the schema and the code drift apart.

- [ ] **Step 3: Update `supabase/schema.sql` so a fresh DB matches**

The file already has `DROP TABLE IF EXISTS public.product_slug_history CASCADE;` and `DROP TABLE IF EXISTS public.not_found_log CASCADE;` — wait, it doesn't yet. Add them to the top DROP block:

```sql
DROP TABLE IF EXISTS public.product_images       CASCADE;
DROP TABLE IF EXISTS public.product_slug_history CASCADE;
DROP TABLE IF EXISTS public.products             CASCADE;
DROP TABLE IF EXISTS public.categories           CASCADE;
DROP TABLE IF EXISTS public.redirects            CASCADE;
DROP TABLE IF EXISTS public.not_found_log        CASCADE;
DROP TABLE IF EXISTS public.admin_users          CASCADE;
```

In the `products` `CREATE TABLE` add `deleted_at timestamptz NULL,` immediately after `updated_at`.

In the `redirects` `CREATE TABLE`, change the `status_code` CHECK to `CHECK (status_code IN (301, 302, 307, 308, 410))`.

After the existing `product_images` block, insert the full `product_slug_history` and `not_found_log` table definitions (copy from the migration file above, dropping the `IF NOT EXISTS` and `DROP POLICY IF EXISTS` because schema.sql is destructive).

In the RLS section at the bottom, append the four new policies (slug-history admin select/insert/delete, not_found_log admin select / anon insert / admin delete).

Run a syntax check by running the SQL through Supabase Studio SQL editor in a transaction-rollback mode (or just paste it into a fresh test project to confirm it executes cleanly). Don't apply it to production — production has data.

- [ ] **Step 4: Regenerate the Database types**

If the project uses the Supabase CLI:
```bash
supabase gen types typescript --project-id <YOUR_PROJECT_ID> --schema public > lib/supabase/database.types.ts
```

If not configured, manually add the new tables and the `deleted_at` column to `lib/supabase/database.types.ts` matching the existing style. The implementer should preview the diff in their editor before staging.

Verify: `npx tsc --noEmit` exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ supabase/schema.sql lib/supabase/database.types.ts
git commit -m "Migrate schema for slug history, soft delete, 404 log, 410 redirects"
git push origin main
```

---

## Task 4: Slug conflict detection + Georgian admin errors

**Files:**
- Create: `lib/admin/slug-conflicts.ts`
- Create: `lib/admin/slug-conflicts.test.ts`
- Modify: `lib/admin/schemas.ts` (add Georgian messages on slug validation)
- Modify: `app/(admin)/admin/(dashboard)/products/actions.ts`

- [ ] **Step 1: Add Georgian messages for slug validation in `lib/admin/schemas.ts`**

Find the `productSchema` definition and update the `slug` field's Zod refinements to include `message:` strings in Georgian:

```ts
slug: z
  .string()
  .min(1, { message: "სლაგი სავალდებულოა" })
  .max(80, { message: "სლაგი 80 სიმბოლოზე გრძელია" })
  .refine(isValidSlug, { message: "სლაგი მხოლოდ ASCII ასოებით, ციფრებითა და დეფისებით" }),
```

Leave English messages on fields where they were already English.

- [ ] **Step 2: Write the failing tests (`lib/admin/slug-conflicts.test.ts`)**

```ts
import { describe, it, expect, vi } from "vitest";
import { detectSlugConflicts } from "./slug-conflicts";

function makeSupabaseStub(overrides: {
  productMatch?: { id: string } | null;
  redirectMatch?: { from_path: string } | null;
}) {
  return {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        in: () => chain,
        is: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          if (table === "products") return { data: overrides.productMatch ?? null, error: null };
          return { data: null, error: null };
        },
      };
      // Redirects use .in() on from_path for both locales
      if (table === "redirects") {
        return {
          select: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: overrides.redirectMatch ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return chain;
    },
  } as unknown as Parameters<typeof detectSlugConflicts>[0]["supabase"];
}

describe("detectSlugConflicts", () => {
  it("returns ok when nothing collides", async () => {
    const supabase = makeSupabaseStub({});
    const result = await detectSlugConflicts({
      supabase,
      slug: "linen-three-seater",
      categorySlug: "sofas",
      excludeProductId: null,
    });
    expect(result.ok).toBe(true);
  });

  it("flags a published product that already owns the slug", async () => {
    const supabase = makeSupabaseStub({ productMatch: { id: "prod-other" } });
    const result = await detectSlugConflicts({
      supabase,
      slug: "linen-three-seater",
      categorySlug: "sofas",
      excludeProductId: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("slug_in_use");
      expect(result.message_ka.length).toBeGreaterThan(0);
    }
  });

  it("does NOT flag the same product editing its own row", async () => {
    const supabase = makeSupabaseStub({ productMatch: { id: "prod-self" } });
    // The helper should treat productMatch.id === excludeProductId as no-conflict.
    // The stub above can't differentiate; the real helper does it via .neq("id", excludeId)
    // — the test asserts that wiring by setting excludeProductId to the matched id and
    // returning null from the stub for that case. Adjust stub:
    const supabase2 = {
      from(table: string) {
        if (table === "products") {
          return {
            select: () => ({
              eq: () => ({
                neq: (col: string, val: string) => ({
                  is: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: val === "prod-self" ? null : { id: "prod-other" },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      },
    } as never;

    const result = await detectSlugConflicts({
      supabase: supabase2 as never,
      slug: "linen-three-seater",
      categorySlug: "sofas",
      excludeProductId: "prod-self",
    });
    expect(result.ok).toBe(true);
  });

  it("flags a redirect that collides with the new public path", async () => {
    const supabase = makeSupabaseStub({
      redirectMatch: { from_path: "/ka/sofas/linen-three-seater" },
    });
    const result = await detectSlugConflicts({
      supabase,
      slug: "linen-three-seater",
      categorySlug: "sofas",
      excludeProductId: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("redirect_conflict");
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test
```

Expected: tests fail because `lib/admin/slug-conflicts.ts` doesn't exist.

- [ ] **Step 4: Implement `lib/admin/slug-conflicts.ts`**

```ts
// lib/admin/slug-conflicts.ts
//
// Centralized slug-conflict detection for admin product mutations.
//
// Two checks, both run server-side via the admin Supabase client:
//   1. No other published product already owns this slug.
//      (Editing the same product is fine; pass excludeProductId.)
//   2. No redirects.from_path collides with the new public path,
//      because that would 301-loop or shadow a real product.
//
// Errors are returned with a code and a Georgian-language message so
// the form can show them inline. English callers can map the code.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Conflict =
  | { ok: true }
  | { ok: false; code: "slug_in_use"; message_ka: string }
  | { ok: false; code: "redirect_conflict"; message_ka: string };

type Args = {
  supabase: SupabaseClient<Database>;
  slug: string;
  categorySlug: string;
  excludeProductId: string | null;
};

const LOCALES = ["ka", "en"] as const;

export async function detectSlugConflicts({
  supabase,
  slug,
  categorySlug,
  excludeProductId,
}: Args): Promise<Conflict> {
  // 1. Slug already owned by another non-deleted product?
  const productQuery = supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null);

  const productScoped = excludeProductId
    ? productQuery.neq("id", excludeProductId)
    : productQuery;

  const { data: productMatch } = await productScoped.limit(1).maybeSingle();
  if (productMatch) {
    return {
      ok: false,
      code: "slug_in_use",
      message_ka: "ეს სლაგი სხვა პროდუქტს უკვე აქვს",
    };
  }

  // 2. Redirect collision?  Build the candidate paths for both locales
  //    and check the redirects table for any matching `from_path`.
  const candidates = LOCALES.map((loc) => `/${loc}/${categorySlug}/${slug}`);
  const { data: redirectMatch } = await supabase
    .from("redirects")
    .select("from_path")
    .in("from_path", candidates)
    .limit(1)
    .maybeSingle();

  if (redirectMatch) {
    return {
      ok: false,
      code: "redirect_conflict",
      message_ka: "ამ სლაგზე უკვე არსებობს გადამისამართება",
    };
  }

  return { ok: true };
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test
```

Expected: all `detectSlugConflicts` tests pass.

- [ ] **Step 6: Wire into `app/(admin)/admin/(dashboard)/products/actions.ts`**

In `createProductAction` and `updateProductAction`, immediately after Zod parsing succeeds and before the Supabase insert/update, look up the category slug (already done in update; do similarly in create — fetch `categories` row by `category_id`), then call `detectSlugConflicts`. On conflict, return:

```ts
return {
  ok: false,
  message: result.message_ka, // top-level toast
  fieldErrors: { slug: result.message_ka },
};
```

Reuse the `ActionState` shape that's already in the file.

- [ ] **Step 7: Run full check**

```bash
npx tsc --noEmit && npm run lint && npm test
```

All three pass.

- [ ] **Step 8: Commit**

```bash
git add lib/admin/slug-conflicts.ts lib/admin/slug-conflicts.test.ts \
        lib/admin/schemas.ts \
        'app/(admin)/admin/(dashboard)/products/actions.ts'
git commit -m "Detect slug conflicts in admin with Georgian errors"
git push origin main
```

---

## Task 5: Slug history insert on slug change

**Files:**
- Modify: `app/(admin)/admin/(dashboard)/products/actions.ts`

- [ ] **Step 1: Extend `updateProductAction` to insert into `product_slug_history`**

Inside the existing `if (next.slug !== prev.slug || ...)` block, BEFORE the redirects upsert, insert one row into `product_slug_history`:

```ts
if (next.slug !== prev.slug) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("product_slug_history").insert({
    product_id: productId,
    old_slug: prev.slug,
    changed_by: user?.id ?? null,
  });
}
```

(The `changed_by` lookup uses `auth.getUser()` on the server-side admin client. If that returns null in a service-role context, the column accepts NULL — fine.)

- [ ] **Step 2: Manual smoke test**

Boot dev: `npm run dev`. Log in to `/admin`. Edit any product, change its slug, save. Open Supabase Studio → `product_slug_history` table → confirm a row was inserted with the old slug, and the `redirects` table has two new rows (ka + en).

- [ ] **Step 3: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/products/actions.ts'
git commit -m "Record slug history on every slug change"
git push origin main
```

---

## Task 6: Soft delete + redirect-or-410 choice

**Files:**
- Modify: `app/(admin)/admin/(dashboard)/products/actions.ts`
- Modify: `app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx`
- Modify: `lib/data/products.ts`

- [ ] **Step 1: Filter soft-deleted products from public reads**

In `lib/data/products.ts`, every `.from("products").select(...)` call that serves the public site should append `.is("deleted_at", null)`. Walk through each helper (typical names: `getPublishedProducts`, `getProductBySlug`, `getFeaturedProducts`, etc.) and add the filter. Admin reads (in admin server actions) DO NOT add this filter — admins see deleted rows.

Run `npx tsc --noEmit` to confirm.

- [ ] **Step 2: Replace `deleteProductAction` with a soft-delete + choice version**

```ts
type DeleteMode = "redirect" | "gone";

export async function softDeleteProductAction(
  productId: string,
  mode: DeleteMode
): Promise<ActionState> {
  await requireAdmin();
  if (!productId) return { ok: false, message: "Missing product id." };

  const supabase = createSupabaseAdminClient();

  // Fetch the row so we know what URL to redirect from.
  const { data: existing } = await supabase
    .from("products")
    .select("slug, categories ( slug )")
    .eq("id", productId)
    .single();
  if (!existing) return { ok: false, message: "Product not found." };

  const row = existing as unknown as {
    slug: string;
    categories: { slug: string } | null;
  };

  // 1. Mark deleted.
  const { error: updateErr } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId);
  if (updateErr) return { ok: false, message: updateErr.message };

  // 2. Wire up either a redirect or a 410.
  const cat = row.categories?.slug ?? "";
  if (cat) {
    if (mode === "redirect") {
      const rows = (["ka", "en"] as const).map((loc) => ({
        from_path: `/${loc}/${cat}/${row.slug}`,
        to_path: `/${loc}/${cat}`,
        status_code: 301 as const,
      }));
      await supabase.from("redirects").upsert(rows, { onConflict: "from_path" });
    } else {
      const rows = (["ka", "en"] as const).map((loc) => ({
        from_path: `/${loc}/${cat}/${row.slug}`,
        to_path: `/${loc}/${cat}`, // ignored at status 410, but the column is NOT NULL
        status_code: 410 as const,
      }));
      await supabase.from("redirects").upsert(rows, { onConflict: "from_path" });
    }
  }

  revalidatePublicSurfaces(cat || undefined, row.slug);
  redirect("/admin/products?deleted=1");
}
```

The old `deleteProductAction` can be removed; if anything imports it, replace with `softDeleteProductAction(id, "redirect")`. Search:

```bash
grep -rn 'deleteProductAction' app components --include='*.tsx' --include='*.ts'
```

- [ ] **Step 3: Update the edit-page UI to expose the choice**

In `app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx` (or wherever the delete button lives), replace the bare delete button with a small form that includes a `<select>`:

```tsx
<form action={async () => {
  "use server";
  // dispatch through softDeleteProductAction with the chosen mode
}}>
  <select name="mode" defaultValue="redirect">
    <option value="redirect">Redirect to category</option>
    <option value="gone">Mark as gone (410)</option>
  </select>
  <button type="submit">Delete</button>
</form>
```

(Use the existing form-action pattern in the file — don't invent a new one. The implementer can shape this around the form library already in use.)

- [ ] **Step 4: Smoke test**

`npm run dev`, log in, soft-delete a published product with mode "redirect". Confirm:
- The product no longer appears on the public site.
- Visiting its old URL `/ka/<category>/<slug>` 301-redirects to `/ka/<category>`.
- The `products` row still exists with `deleted_at` set.

Repeat with mode "gone". Visiting the URL should currently still 301 to the category — Task 7 wires up the 410 path.

- [ ] **Step 5: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/products/' lib/data/products.ts
git commit -m "Soft-delete products with redirect-or-410 choice"
git push origin main
```

---

## Task 7: 410 Gone route handler + proxy branch

**Files:**
- Create: `app/[locale]/_gone/route.ts`
- Modify: `proxy.ts`

- [ ] **Step 1: Create `app/[locale]/_gone/route.ts`**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Renders a minimal 410 Gone page in the active locale.
// Plan 5 will replace this with a fully branded layout matching the
// rest of the site; for now we ship correct semantics with bare HTML.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const isKa = locale === "ka";

  const title = isKa ? "გვერდი წაშლილია" : "This page is gone";
  const body = isKa
    ? "ეს პროდუქტი აღარ არის ხელმისაწვდომი. გადახედეთ ჩვენს კატალოგს."
    : "This product is no longer available. Browse our catalogue.";
  const cta = isKa ? "კატეგორიები" : "Browse categories";

  const html = `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="robots" content="noindex" />
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem;">
    <h1>${title}</h1>
    <p>${body}</p>
    <p><a href="/${locale}">${cta}</a></p>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Update `proxy.ts` to rewrite 410 redirects to `/_gone`**

Find `checkRedirect` in `proxy.ts`. Currently it returns `NextResponse.redirect(url, { status: data.status_code })` for every match. Branch on status:

```ts
if (data.status_code === 410) {
  // Rewrite to the locale's _gone route handler so the response carries
  // the correct 410 status with a localized body. The handler reads the
  // locale from the URL.
  const locale = pathname.split("/")[1] || "ka";
  const goneUrl = request.nextUrl.clone();
  goneUrl.pathname = `/${locale}/_gone`;
  return NextResponse.rewrite(goneUrl);
}
const url = request.nextUrl.clone();
url.pathname = data.to_path;
return NextResponse.redirect(url, { status: data.status_code });
```

- [ ] **Step 3: Apply CSP to the rewrite**

The existing `applyCspToResponse` is called on regular path responses but `checkRedirect` returns early. Update `proxy.ts`'s default export so a 410 rewrite still runs through `applyCspToResponse`. Easiest: wrap the rewrite in `applyCspToResponse(request, NextResponse.rewrite(goneUrl))` inside `checkRedirect`, and have the main `proxy` function recognize the 410-rewrite case (pass the already-CSP'd response through).

Cleanest implementation: have `checkRedirect` return `{ kind: "redirect", response } | { kind: "gone", response } | null` and let `proxy()` apply CSP only to the `gone` case. The implementer chooses the exact shape — the goal is: 30x → no CSP, 410 page → CSP applied.

- [ ] **Step 4: Smoke test**

`npm run build && npm start`. Find a product you marked "gone" in Task 6. `curl -I http://localhost:3000/ka/<cat>/<slug>` — expect HTTP 410 with a Content-Security-Policy header. `curl -s` → confirm Georgian "გვერდი წაშლილია" body.

- [ ] **Step 5: Commit**

```bash
git add 'app/[locale]/_gone/' proxy.ts
git commit -m "Serve 410 Gone for soft-deleted products marked unavailable"
git push origin main
```

---

## Task 8: 404 logging via `not-found` boundary

**Files:**
- Create: `app/api/log-404/route.ts`
- Create: `app/[locale]/not-found.tsx`

- [ ] **Step 1: Create the API route `app/api/log-404/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Beacon endpoint hit by the locale not-found page when a path 404s.
// We hash the IP before storage so the table can't be used for tracking
// individual visitors but can still answer "is this the same source?".

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // FNV-1a 32-bit; cheap and good enough for grouping.
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { path?: string; locale?: string; referrer?: string }
    | null;
  if (!body?.path) return NextResponse.json({ ok: false }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const supabase = createSupabaseAdminClient();
  await supabase.from("not_found_log").insert({
    path: body.path.slice(0, 2048),
    locale: body.locale ?? null,
    referrer: body.referrer?.slice(0, 2048) ?? null,
    ip_hash: hashIp(ip),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create `app/[locale]/not-found.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    void fetch("/api/log-404", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        locale: pathname.split("/")[1] || null,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return (
    <main style={{ padding: "4rem 1rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>404</h1>
      <p>Page not found.</p>
    </main>
  );
}
```

(Plan 5 will replace this with a branded Georgian + English version that matches the site theme.)

- [ ] **Step 3: Smoke test**

`npm run dev`. Visit `http://localhost:3000/ka/this-does-not-exist`. The 404 page renders, fires the beacon. Open Supabase Studio → `not_found_log` → confirm a row was inserted with the expected `path` and `locale: "ka"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/log-404/ 'app/[locale]/not-found.tsx'
git commit -m "Log 404s to not_found_log via not-found beacon"
git push origin main
```

---

## Task 9: Live slug preview in admin product form

**Files:**
- Create: `components/admin/slug-preview.tsx`
- Modify: `app/(admin)/admin/(dashboard)/products/new/page.tsx`
- Modify: `app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx`

- [ ] **Step 1: Create the preview component**

```tsx
"use client";

// Reads the value of two named form inputs (name_ka, name_en, slug)
// and renders a small "Preview: <slug>" line under the slug field.
// Calls into lib/slug.slugify, which now routes through transliterate
// for Georgian text. Pure client-side — no server round-trip.

import { useEffect, useState } from "react";
import { slugify } from "@/lib/slug";

type Props = {
  // The form's id prefix, so this works on both create and edit forms.
  formId?: string;
};

export function SlugPreview({ formId = "product-form" }: Props) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const recompute = () => {
      const slug = (form.elements.namedItem("slug") as HTMLInputElement | null)?.value ?? "";
      const nameKa = (form.elements.namedItem("name_ka") as HTMLInputElement | null)?.value ?? "";
      const nameEn = (form.elements.namedItem("name_en") as HTMLInputElement | null)?.value ?? "";

      // Manual override wins.
      if (slug.trim()) {
        setPreview(slug.trim());
        return;
      }
      // Otherwise prefer Georgian transliteration; fall back to English.
      setPreview(slugify(nameKa) || slugify(nameEn));
    };

    recompute();
    form.addEventListener("input", recompute);
    return () => form.removeEventListener("input", recompute);
  }, [formId]);

  if (!preview) return null;
  return (
    <p className="text-sm text-muted-foreground mt-1" aria-live="polite">
      Preview: <code>{preview}</code>
    </p>
  );
}
```

- [ ] **Step 2: Wire it into both product forms**

In `new/page.tsx` and `[id]/edit/page.tsx`, find the form opening tag and ensure it has `id="product-form"`. Add `<SlugPreview />` immediately after the slug `<input>`.

- [ ] **Step 3: Smoke test**

`npm run dev`. Open `/admin/products/new`. Type a Georgian product name. The preview line under the slug field updates in real time, e.g. "Preview: lineni-divani". Type something into the slug field manually — preview switches to that.

- [ ] **Step 4: Commit**

```bash
git add components/admin/slug-preview.tsx \
        'app/(admin)/admin/(dashboard)/products/new/page.tsx' \
        'app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx'
git commit -m "Show live slug preview as admin types name"
git push origin main
```

---

## Task 10: `/admin/seo` page scaffold + summary cards

**Files:**
- Create: `app/(admin)/admin/(dashboard)/seo/page.tsx`
- Modify: `app/(admin)/admin/(dashboard)/layout.tsx` (add nav link)
- Modify: `messages/ka.json` and `messages/en.json` (label strings)

- [ ] **Step 1: Add nav-link strings**

In `messages/ka.json`: `"admin": { "seo": "SEO აუდიტი", ... }`
In `messages/en.json`: `"admin": { "seo": "SEO Audit", ... }`

(Field-name keys may already exist; pick one that fits.)

- [ ] **Step 2: Add the link in the dashboard layout**

In `app/(admin)/admin/(dashboard)/layout.tsx`, find the existing nav list and add a `/admin/seo` entry alongside `/admin/products`, `/admin/categories`, `/admin/redirects`.

- [ ] **Step 3: Build the page with summary cards**

```tsx
// app/(admin)/admin/(dashboard)/seo/page.tsx
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SeoAuditPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const [
    { count: redirectCount },
    { count: historyCount },
    { count: productsMissingImages },
    { count: productsMissingDescriptions },
  ] = await Promise.all([
    supabase.from("redirects").select("*", { count: "exact", head: true }),
    supabase.from("product_slug_history").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("*, product_images!left(id)", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_published", true)
      .filter("product_images.id", "is", null),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_published", true)
      .or("description_ka.eq.,description_en.eq."),
  ]);

  return (
    <main>
      <h1>SEO Audit</h1>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Redirects" value={redirectCount ?? 0} />
        <Card label="Slug history entries" value={historyCount ?? 0} />
        <Card label="Products missing images" value={productsMissingImages ?? 0} />
        <Card label="Products missing descriptions" value={productsMissingDescriptions ?? 0} />
      </section>
      {/* Tables added in Tasks 11-13. */}
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Smoke test**

`npm run dev`. Browse to `/admin/seo`. The four cards render with real numbers from the DB.

- [ ] **Step 5: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/seo/' \
        'app/(admin)/admin/(dashboard)/layout.tsx' \
        messages/
git commit -m "Add /admin/seo dashboard with summary cards"
git push origin main
```

---

## Task 11: Redirects table on the SEO page

**Files:**
- Modify: `app/(admin)/admin/(dashboard)/seo/page.tsx`

- [ ] **Step 1: Fetch and render the redirects list**

Below the cards, add a `<section>` that fetches redirects ordered by `created_at DESC` (limit 100) and renders a table with columns: From, To, Status, Created, Action. The "Action" cell is a small form bound to the EXISTING `deleteRedirectAction` from `app/(admin)/admin/(dashboard)/redirects/actions.ts` — import and reuse it; do NOT define a new one.

```tsx
const { data: redirects } = await supabase
  .from("redirects")
  .select("id, from_path, to_path, status_code, created_at")
  .order("created_at", { ascending: false })
  .limit(100);

// ... render table; use deleteRedirectAction(id) on the form action
```

- [ ] **Step 2: Smoke test**

`/admin/seo` → table renders. Click a delete button on a redirect that doesn't matter. Confirm it disappears from the table on refresh.

- [ ] **Step 3: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/seo/page.tsx'
git commit -m "List redirects on SEO dashboard with remove action"
git push origin main
```

---

## Task 12: 404 list + quick-redirect action

**Files:**
- Create: `app/(admin)/admin/(dashboard)/seo/actions.ts`
- Modify: `app/(admin)/admin/(dashboard)/seo/page.tsx`

- [ ] **Step 1: Create the quick-redirect server action**

```ts
// app/(admin)/admin/(dashboard)/seo/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createRedirectFrom404Action(
  fromPath: string,
  toPath: string
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!fromPath || !toPath) return { ok: false, message: "Missing path." };
  if (fromPath === toPath) return { ok: false, message: "From and To cannot match." };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("redirects")
    .upsert(
      { from_path: fromPath, to_path: toPath, status_code: 301 },
      { onConflict: "from_path" }
    );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
```

- [ ] **Step 2: Render the 404 table on the SEO page**

Query `not_found_log` aggregated by path over the last 30 days; show top 50 by count. Each row gets a "Create redirect" button that opens an inline form (or a small dialog) where the admin types the destination. Submit calls `createRedirectFrom404Action(fromPath, toPath)`.

```ts
const { data: notFounds } = await supabase
  .from("not_found_log")
  .select("path, occurred_at")
  .gte("occurred_at", new Date(Date.now() - 30 * 86400_000).toISOString())
  .order("occurred_at", { ascending: false })
  .limit(500);

// Aggregate in memory:
const counts = new Map<string, { count: number; lastSeen: string }>();
for (const row of notFounds ?? []) {
  const cur = counts.get(row.path) ?? { count: 0, lastSeen: row.occurred_at };
  counts.set(row.path, { count: cur.count + 1, lastSeen: cur.lastSeen });
}
const top = [...counts.entries()]
  .sort(([, a], [, b]) => b.count - a.count)
  .slice(0, 50);
```

(For larger tables this should move into a SQL aggregation; 500 rows / 50 paths is fine for now.)

- [ ] **Step 3: Smoke test**

Visit some bad URLs to populate the log. Reload `/admin/seo`. The 404 table shows them. Click "Create redirect" on a row, fill in a target path, submit. Verify the redirect now appears in the redirects table above and that visiting the original URL 301s to the target.

- [ ] **Step 4: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/seo/'
git commit -m "Show recent 404s with quick-redirect action"
git push origin main
```

---

## Task 13: Orphan slugs table + cleanup

**Files:**
- Modify: `app/(admin)/admin/(dashboard)/seo/actions.ts`
- Modify: `app/(admin)/admin/(dashboard)/seo/page.tsx`

- [ ] **Step 1: Add the cleanup action**

```ts
// in seo/actions.ts
export async function cleanupOrphanSlugAction(
  historyId: string
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!historyId) return { ok: false, message: "Missing id." };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_slug_history")
    .delete()
    .eq("id", historyId);
  if (error) return { ok: false, message: error.message };

  return { ok: true };
}
```

- [ ] **Step 2: Render the orphan slugs section**

A slug-history entry is "orphan" when its `product_id` no longer exists OR points to a soft-deleted product. Query both:

```ts
const { data: orphans } = await supabase
  .from("product_slug_history")
  .select("id, product_id, old_slug, changed_at, products!inner ( id, deleted_at )")
  .not("products.deleted_at", "is", null)
  .order("changed_at", { ascending: false })
  .limit(100);
```

(For history entries pointing to a HARD-deleted product — which can happen in existing data from before this plan — also run a second query without the inner join to detect rows whose `product_id` doesn't appear in `products`. Combine the two lists in JS.)

Render a table of `old_slug` + `changed_at` + a "Clean up" button calling `cleanupOrphanSlugAction(id)`.

- [ ] **Step 3: Smoke test**

After running `softDeleteProductAction` from Task 6 against a product, that product's slug-history entries should appear in the orphans section of `/admin/seo`. Click "Clean up" on one — confirm it disappears.

- [ ] **Step 4: Commit**

```bash
git add 'app/(admin)/admin/(dashboard)/seo/'
git commit -m "List and clean up orphan slug-history entries"
git push origin main
```

---

## Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Tests + types + lint + build**

```bash
cd /home/moonpatrick/furnituremodern
npm test          # all unit tests pass
npx tsc --noEmit  # exit 0
npm run lint      # exit 0
npm run build     # exit 0
```

- [ ] **Step 2: Manual smoke walk-through**

Run `npm start` and exercise the full flow:

1. Create a product with name `ლინენი სამადგილიანი დივანი` and an empty slug. Submit. Confirm slug auto-fills to a sensible BGN/PCGN value.
2. Edit it: change the slug. Save. Confirm `product_slug_history` got a row, `redirects` got two rows (ka + en, status 301), and the old URL 301-redirects in the browser.
3. Try to save another product with the same slug — confirm a Georgian inline error.
4. Soft-delete a product with mode "redirect". Confirm public page redirects to category.
5. Soft-delete a different product with mode "gone". Confirm the URL returns HTTP 410 with the gone page.
6. Visit a junk URL `/ka/nope/nope`. Confirm `not_found_log` got a row.
7. Open `/admin/seo`. Cards show real numbers. Redirects table renders. 404 table shows the junk URL with "Create redirect" working. Orphan slugs table shows entries from the soft-deleted products and "Clean up" works.

If any step fails, fix the regression with one more commit and re-run the gate.

- [ ] **Step 3: Final commit only if needed**

If the smoke walk surfaced any small fixes, commit them with a descriptive message. Otherwise no commit is required for Task 14.

---

## Verification Gate (Plan 2 done when all of these pass)

- [ ] `npm test` → all unit tests pass (transliterate.test.ts and slug-conflicts.test.ts).
- [ ] `npx tsc --noEmit` → exit 0.
- [ ] `npm run lint` → 0 issues.
- [ ] `npm run build` → 0 errors.
- [ ] Empty-slug product creation auto-transliterates the Georgian name to ASCII.
- [ ] Slug change writes BOTH a `product_slug_history` row AND two `redirects` rows (ka + en).
- [ ] Saving a slug that another published product owns → inline Georgian error, no DB write.
- [ ] Saving a slug that collides with an existing redirect's `from_path` → inline Georgian error.
- [ ] Soft-delete with mode "redirect" → 301 to category in browser, `deleted_at` set on row.
- [ ] Soft-delete with mode "gone" → HTTP 410 in browser with the gone page; CSP header still present.
- [ ] `/api/log-404` insert succeeds when not-found page renders.
- [ ] `/admin/seo` cards, redirects table, 404 table, and orphan slugs table all render and their action buttons work end to end.

When the gate passes, Plan 2 is complete and ready for Plan 3 (Consent + Analytics + RUM).
