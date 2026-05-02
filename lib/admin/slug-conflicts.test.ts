import { describe, it, expect } from "vitest";
import { detectSlugConflicts } from "./slug-conflicts";

function makeSupabaseStub(overrides: {
  productMatch?: { id: string } | null;
  redirectMatch?: { from_path: string } | null;
}) {
  // Build a chainable stub that returns `chain` from every builder
  // method and resolves `maybeSingle()` based on the table.
  const chain: Record<string, unknown> = {};
  const builders = ["select", "eq", "neq", "in", "is", "limit"];
  for (const m of builders) {
    chain[m] = () => chain;
  }

  return {
    from(table: string) {
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
    // returns null. Simulate that here.
    const supabase = makeSupabaseStub({ productMatch: null });
    const result = await detectSlugConflicts({
      supabase,
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
