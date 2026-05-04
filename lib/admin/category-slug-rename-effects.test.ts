import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  recordCategorySlugChange,
  writeCategorySlugRedirects,
} from "./category-slug-rename-effects";

vi.mock("@/lib/observability", () => ({
  logError: vi.fn(),
}));

import { logError } from "@/lib/observability";

type InsertedRow = Record<string, unknown>;

type SupabaseStub = {
  insert: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  lastInsert?: InsertedRow;
  lastUpsertRows?: InsertedRow[];
  lastUpsertOptions?: Record<string, unknown>;
};

function makeSupabase(opts: {
  insertError?: { message: string; code?: string } | null;
  upsertError?: { message: string; code?: string } | null;
}): {
  client: Parameters<typeof recordCategorySlugChange>[0]["supabase"];
  stub: SupabaseStub;
} {
  const stub: SupabaseStub = {
    insert: vi.fn(async (row: InsertedRow) => {
      stub.lastInsert = row;
      return { data: null, error: opts.insertError ?? null };
    }),
    upsert: vi.fn(
      async (
        rows: InsertedRow[],
        options?: Record<string, unknown>
      ) => {
        stub.lastUpsertRows = rows;
        stub.lastUpsertOptions = options;
        return { data: null, error: opts.upsertError ?? null };
      }
    ),
  };
  const client = {
    from(table: string) {
      if (table === "category_slug_history") {
        return { insert: stub.insert };
      }
      if (table === "redirects") {
        return { upsert: stub.upsert };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as Parameters<typeof recordCategorySlugChange>[0]["supabase"];
  return { client, stub };
}

describe("recordCategorySlugChange", () => {
  beforeEach(() => {
    vi.mocked(logError).mockClear();
  });

  it("returns ok and inserts the audit row on success", async () => {
    const { client, stub } = makeSupabase({});
    const result = await recordCategorySlugChange({
      supabase: client,
      categoryId: "cat-123",
      changedBy: "admin-user-id",
      oldSlug: "old-slug",
    });
    expect(result.ok).toBe(true);
    expect(stub.insert).toHaveBeenCalledOnce();
    expect(stub.lastInsert).toEqual({
      category_id: "cat-123",
      old_slug: "old-slug",
      changed_by: "admin-user-id",
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("returns an explicit failure message and forwards to logError on insert error", async () => {
    const { client } = makeSupabase({
      insertError: { message: "constraint violation", code: "23505" },
    });
    const result = await recordCategorySlugChange({
      supabase: client,
      categoryId: "cat-123",
      changedBy: "admin-user-id",
      oldSlug: "old-slug",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Category saved");
      expect(result.message).toContain("recording the slug history failed");
      expect(result.message).toContain("Re-save to retry");
    }
    expect(logError).toHaveBeenCalledOnce();
    const [, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(ctxArg?.route).toBe(
      "admin/categories/actions:recordCategorySlugChange"
    );
    expect(ctxArg?.tags?.category_id).toBe("cat-123");
    expect(ctxArg?.tags?.old_slug).toBe("old-slug");
    expect(ctxArg?.tags?.code).toBe("23505");
  });
});

describe("writeCategorySlugRedirects", () => {
  beforeEach(() => {
    vi.mocked(logError).mockClear();
  });

  it("writes a category-level redirect per locale, even with no products", async () => {
    const { client, stub } = makeSupabase({});
    const result = await writeCategorySlugRedirects({
      supabase: client,
      oldSlug: "old-cat",
      newSlug: "new-cat",
      productSlugs: [],
    });
    expect(result.ok).toBe(true);
    expect(stub.lastUpsertRows).toEqual([
      {
        from_path: "/ka/old-cat",
        to_path: "/ka/new-cat",
        status_code: 301,
      },
      {
        from_path: "/en/old-cat",
        to_path: "/en/new-cat",
        status_code: 301,
      },
    ]);
    expect(stub.lastUpsertOptions).toEqual({
      onConflict: "from_path",
      ignoreDuplicates: false,
    });
  });

  it("emits one row per locale × (category-itself + every product slug)", async () => {
    const { client, stub } = makeSupabase({});
    const result = await writeCategorySlugRedirects({
      supabase: client,
      oldSlug: "tables",
      newSlug: "tables-chairs",
      productSlugs: ["oak-table", "round-pedestal"],
    });
    expect(result.ok).toBe(true);
    // 2 locales × (1 category + 2 products) = 6 rows.
    expect(stub.lastUpsertRows).toHaveLength(6);
    const fromPaths = (stub.lastUpsertRows ?? []).map(
      (r) => r.from_path
    );
    expect(fromPaths).toContain("/ka/tables");
    expect(fromPaths).toContain("/ka/tables/oak-table");
    expect(fromPaths).toContain("/ka/tables/round-pedestal");
    expect(fromPaths).toContain("/en/tables");
    expect(fromPaths).toContain("/en/tables/oak-table");
    expect(fromPaths).toContain("/en/tables/round-pedestal");
  });

  it("returns an explicit failure message and forwards to logError on upsert error", async () => {
    const { client } = makeSupabase({
      upsertError: { message: "permission denied", code: "42501" },
    });
    const result = await writeCategorySlugRedirects({
      supabase: client,
      oldSlug: "old",
      newSlug: "new",
      productSlugs: ["p1"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Category saved");
      expect(result.message).toContain(
        "creating the redirect from the old URL failed"
      );
    }
    expect(logError).toHaveBeenCalledOnce();
    const [, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(ctxArg?.route).toBe(
      "admin/categories/actions:writeCategorySlugRedirects"
    );
    expect(ctxArg?.tags?.code).toBe("42501");
    expect(ctxArg?.tags?.product_count).toBe("1");
  });

  it("contract: PII MUST NOT appear in the log context", async () => {
    const { client } = makeSupabase({
      upsertError: { message: "denied", code: "42501" },
    });
    await writeCategorySlugRedirects({
      supabase: client,
      oldSlug: "old",
      newSlug: "new",
      productSlugs: [],
    });
    const ctx = vi.mocked(logError).mock.calls[0]?.[1];
    const ctxJson = JSON.stringify(ctx);
    expect(ctxJson).not.toMatch(/email|@|ip[_-]?address|user[_-]?id/i);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
});
