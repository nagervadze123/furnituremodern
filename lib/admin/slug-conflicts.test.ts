import { describe, it, expect, vi } from "vitest";
import { detectSlugConflicts } from "./slug-conflicts";

type Overrides = {
  productMatch?: { id: string } | null;
  redirectMatch?: { from_path: string } | null;
};

type NeqSpy = ((col: string, val: unknown) => void) & {
  mock: { calls: unknown[][] };
};

// Builds a fresh chainable stub on every from() call so interleaved
// queries (products, then redirects) do not alias state.
function makeSupabaseStub(overrides: Overrides, neqSpy?: NeqSpy) {
  const builders = ["select", "eq", "in", "is", "limit"];

  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const m of builders) {
        chain[m] = () => chain;
      }
      chain.neq = (col: string, val: unknown) => {
        neqSpy?.(col, val);
        return chain;
      };
      chain.maybeSingle = async () => {
        if (table === "products") return { data: overrides.productMatch ?? null, error: null };
        if (table === "redirects") return { data: overrides.redirectMatch ?? null, error: null };
        return { data: null, error: null };
      };
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
    // Real helper applies .neq("id", excludeProductId) when excludeProductId
    // is set, so when the only matching row is the product itself, the DB
    // returns null. The neqSpy verifies that wiring.
    const neqSpy = vi.fn() as unknown as NeqSpy;
    const supabase = makeSupabaseStub({ productMatch: null }, neqSpy);
    const result = await detectSlugConflicts({
      supabase,
      slug: "linen-three-seater",
      categorySlug: "sofas",
      excludeProductId: "prod-self",
    });
    expect(result.ok).toBe(true);
    expect(neqSpy).toHaveBeenCalledWith("id", "prod-self");
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
