import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recordSlugChange, writeSlugRedirects } from "./slug-rename-effects";

// In-process spy for logError. The observability shim is dev-mode
// console.warn-only with no DSN configured, so we mock it to assert
// the failure path forwards the error.
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
  client: Parameters<typeof recordSlugChange>[0]["supabase"];
  stub: SupabaseStub;
} {
  const stub: SupabaseStub = {
    insert: vi.fn(async (row: InsertedRow) => {
      stub.lastInsert = row;
      return { data: null, error: opts.insertError ?? null };
    }),
    upsert: vi.fn(async (rows: InsertedRow[], options?: Record<string, unknown>) => {
      stub.lastUpsertRows = rows;
      stub.lastUpsertOptions = options;
      return { data: null, error: opts.upsertError ?? null };
    }),
  };
  const client = {
    from(table: string) {
      if (table === "product_slug_history") {
        return { insert: stub.insert };
      }
      if (table === "redirects") {
        return { upsert: stub.upsert };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as Parameters<typeof recordSlugChange>[0]["supabase"];
  return { client, stub };
}

describe("recordSlugChange", () => {
  beforeEach(() => {
    vi.mocked(logError).mockClear();
  });

  it("returns ok and inserts the audit row on success", async () => {
    const { client, stub } = makeSupabase({});
    const result = await recordSlugChange({
      supabase: client,
      productId: "prod-123",
      changedBy: "admin-user-id",
      oldSlug: "old-slug",
    });
    expect(result.ok).toBe(true);
    expect(stub.insert).toHaveBeenCalledOnce();
    expect(stub.lastInsert).toEqual({
      product_id: "prod-123",
      old_slug: "old-slug",
      changed_by: "admin-user-id",
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("returns an explicit failure message and forwards to logError on insert error", async () => {
    const { client } = makeSupabase({
      insertError: { message: "constraint violation", code: "23505" },
    });
    const result = await recordSlugChange({
      supabase: client,
      productId: "prod-123",
      changedBy: "admin-user-id",
      oldSlug: "old-slug",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Product saved");
      expect(result.message).toContain("recording the slug history failed");
      expect(result.message).toContain("Re-save to retry");
    }
    expect(logError).toHaveBeenCalledOnce();
    const [errArg, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect((errArg as { message: string }).message).toBe(
      "constraint violation"
    );
    expect(ctxArg?.route).toBe("admin/products/actions:recordSlugChange");
    expect(ctxArg?.scope).toBe("route");
    expect(ctxArg?.tags?.product_id).toBe("prod-123");
    expect(ctxArg?.tags?.old_slug).toBe("old-slug");
    expect(ctxArg?.tags?.code).toBe("23505");
  });
});

describe("writeSlugRedirects", () => {
  beforeEach(() => {
    vi.mocked(logError).mockClear();
  });

  it("returns ok and upserts one row per locale on success", async () => {
    const { client, stub } = makeSupabase({});
    const result = await writeSlugRedirects({
      supabase: client,
      oldCategorySlug: "sofas",
      oldSlug: "old-sofa",
      newCategorySlug: "sofas",
      newSlug: "new-sofa",
    });
    expect(result.ok).toBe(true);
    expect(stub.upsert).toHaveBeenCalledOnce();
    expect(stub.lastUpsertRows).toEqual([
      {
        from_path: "/ka/sofas/old-sofa",
        to_path: "/ka/sofas/new-sofa",
        status_code: 301,
      },
      {
        from_path: "/en/sofas/old-sofa",
        to_path: "/en/sofas/new-sofa",
        status_code: 301,
      },
    ]);
    expect(stub.lastUpsertOptions).toEqual({
      onConflict: "from_path",
      ignoreDuplicates: false,
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("handles a category move alongside the slug change", async () => {
    const { client, stub } = makeSupabase({});
    const result = await writeSlugRedirects({
      supabase: client,
      oldCategorySlug: "tables",
      oldSlug: "oak-table",
      newCategorySlug: "sofas",
      newSlug: "oak-table",
    });
    expect(result.ok).toBe(true);
    expect(stub.lastUpsertRows?.[0]?.from_path).toBe("/ka/tables/oak-table");
    expect(stub.lastUpsertRows?.[0]?.to_path).toBe("/ka/sofas/oak-table");
  });

  it("returns an explicit failure message and forwards to logError on upsert error", async () => {
    const { client } = makeSupabase({
      upsertError: { message: "permission denied", code: "42501" },
    });
    const result = await writeSlugRedirects({
      supabase: client,
      oldCategorySlug: "sofas",
      oldSlug: "old-sofa",
      newCategorySlug: "sofas",
      newSlug: "new-sofa",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Product saved");
      expect(result.message).toContain(
        "creating the redirect from the old URL failed"
      );
      expect(result.message).toContain("Re-save to retry");
    }
    expect(logError).toHaveBeenCalledOnce();
    const [errArg, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect((errArg as { message: string }).message).toBe("permission denied");
    expect(ctxArg?.route).toBe("admin/products/actions:writeSlugRedirects");
    expect(ctxArg?.scope).toBe("route");
    expect(ctxArg?.tags?.old_path).toBe("/sofas/old-sofa");
    expect(ctxArg?.tags?.new_path).toBe("/sofas/new-sofa");
    expect(ctxArg?.tags?.code).toBe("42501");
  });

  it("contract: PII (admin user id, IP, email) MUST NOT appear in the log context", async () => {
    const { client } = makeSupabase({
      upsertError: { message: "denied", code: "42501" },
    });
    await writeSlugRedirects({
      supabase: client,
      oldCategorySlug: "sofas",
      oldSlug: "old",
      newCategorySlug: "sofas",
      newSlug: "new",
    });
    const ctx = vi.mocked(logError).mock.calls[0]?.[1];
    const ctxJson = JSON.stringify(ctx);
    expect(ctxJson).not.toMatch(/email|@|ip[_-]?address|user[_-]?id/i);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
});
