import { describe, it, expect, vi, afterEach } from "vitest";

const isSupabaseConfiguredMock = vi.fn(() => true);
const createSupabasePublicClientMock = vi.fn();

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => isSupabaseConfiguredMock(),
}));

vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: () => createSupabasePublicClientMock(),
}));

vi.mock("@/lib/observability", () => ({
  logError: vi.fn(),
}));

import { logError } from "@/lib/observability";
import {
  getCategories,
  getCategoryBySlug,
  getFeaturedNavCategories,
} from "./categories";

// Records every call to a query method so the tests can assert which
// filters were applied. The chain of methods on a Supabase query
// (`select().eq().order().limit().is()`) is itself thenable, so we
// give the chain object a `then` that resolves with `result`.
function makeQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const calls: Array<{ method: string; args: unknown[] }> = [];
  for (const m of ["select", "eq", "order", "limit", "is", "neq"]) {
    chain[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: typeof result) => unknown) => resolve(result);
  return { chain, calls };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(logError).mockClear();
  isSupabaseConfiguredMock.mockReset().mockReturnValue(true);
  createSupabasePublicClientMock.mockReset();
});

function setNodeEnv(value: "production" | "development" | "test") {
  vi.stubEnv("NODE_ENV", value);
}

describe("getCategories — Supabase failure fallback", () => {
  it("production: returns an empty list and logs (no placeholder data)", async () => {
    setNodeEnv("production");
    const error = { message: "RLS denied", code: "42501" };
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error }).chain,
    });
    const result = await getCategories();
    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledOnce();
    const [errArg, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(errArg).toBe(error);
    expect(ctxArg?.route).toBe("lib/data/categories:getCategories");
    expect(ctxArg?.scope).toBe("route");
  });

  it("development: falls back to local placeholder list when Supabase errors", async () => {
    setNodeEnv("development");
    createSupabasePublicClientMock.mockReturnValue({
      from: () =>
        makeQuery({ data: null, error: { message: "boom" } }).chain,
    });
    const result = await getCategories();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
    expect(logError).toHaveBeenCalledOnce();
  });
});

describe("getCategories — query shape", () => {
  it("filters out soft-deleted rows via is_deleted = false", async () => {
    const { chain, calls } = makeQuery({
      data: [
        {
          id: "1",
          slug: "sofas",
          name_ka: "დივნები",
          name_en: "Sofas",
          description_ka: "tag ka",
          description_en: "tag en",
          intro_ka: "intro ka",
          intro_en: "intro en",
          sort_order: 0,
          is_featured_in_nav: true,
        },
      ],
      error: null,
    });
    createSupabasePublicClientMock.mockReturnValue({ from: () => chain });

    const out = await getCategories();
    expect(out).toHaveLength(1);
    expect(out[0]!.slug).toBe("sofas");
    expect(out[0]!.intro.en).toBe("intro en");
    expect(out[0]!.isFeaturedInNav).toBe(true);

    // The query should have set the is_deleted = false filter.
    const eqCalls = calls.filter((c) => c.method === "eq");
    expect(
      eqCalls.some(
        (c) => c.args[0] === "is_deleted" && c.args[1] === false
      )
    ).toBe(true);
  });

  it("orders by sort_order then created_at ascending", async () => {
    const { chain, calls } = makeQuery({ data: [], error: null });
    createSupabasePublicClientMock.mockReturnValue({ from: () => chain });
    await getCategories();
    const orderCalls = calls.filter((c) => c.method === "order");
    expect(orderCalls.length).toBeGreaterThanOrEqual(2);
    expect(orderCalls[0]!.args[0]).toBe("sort_order");
    expect(orderCalls[1]!.args[0]).toBe("created_at");
  });
});

describe("getFeaturedNavCategories", () => {
  it("returns only flagged active rows, capped at 5", async () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      slug: `cat-${i}`,
      name_ka: `n${i}`,
      name_en: `n${i}`,
      description_ka: "",
      description_en: "",
      intro_ka: "",
      intro_en: "",
      sort_order: i,
      // First 6 are flagged → cap should still chop to 5.
      is_featured_in_nav: i < 6,
    }));
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: rows, error: null }).chain,
    });

    const out = await getFeaturedNavCategories();
    expect(out).toHaveLength(5);
    expect(out.every((c) => c.isFeaturedInNav)).toBe(true);
  });

  it("returns empty when no rows are flagged", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      slug: `cat-${i}`,
      name_ka: `n${i}`,
      name_en: `n${i}`,
      description_ka: "",
      description_en: "",
      intro_ka: "",
      intro_en: "",
      sort_order: i,
      is_featured_in_nav: false,
    }));
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: rows, error: null }).chain,
    });

    const out = await getFeaturedNavCategories();
    expect(out).toEqual([]);
  });
});

describe("getCategoryBySlug — Supabase failure fallback", () => {
  it("production: returns null and logs (no placeholder)", async () => {
    setNodeEnv("production");
    createSupabasePublicClientMock.mockReturnValue({
      from: () =>
        makeQuery({ data: null, error: { message: "boom" } }).chain,
    });
    const result = await getCategoryBySlug("sofas");
    expect(result).toBeNull();
    expect(logError).toHaveBeenCalledOnce();
    const [, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(ctxArg?.route).toBe("lib/data/categories:getCategoryBySlug");
  });

  it("development: returns the local placeholder when Supabase errors", async () => {
    setNodeEnv("development");
    createSupabasePublicClientMock.mockReturnValue({
      from: () =>
        makeQuery({ data: null, error: { message: "boom" } }).chain,
    });
    const result = await getCategoryBySlug("sofas");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("sofas");
  });

  it("returns null for an empty result (e.g., soft-deleted slug)", async () => {
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: [], error: null }).chain,
    });
    const result = await getCategoryBySlug("ghost-category");
    expect(result).toBeNull();
  });

  it("maps a Supabase row to DataCategory with intro and isFeaturedInNav", async () => {
    createSupabasePublicClientMock.mockReturnValue({
      from: () =>
        makeQuery({
          data: [
            {
              id: "abc",
              slug: "sofas",
              name_ka: "დივნები",
              name_en: "Sofas",
              description_ka: "tag ka",
              description_en: "tag en",
              intro_ka: "long ka",
              intro_en: "long en",
              sort_order: 0,
              is_featured_in_nav: true,
            },
          ],
          error: null,
        }).chain,
    });
    const result = await getCategoryBySlug("sofas");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("abc");
    expect(result?.intro.ka).toBe("long ka");
    expect(result?.intro.en).toBe("long en");
    expect(result?.isFeaturedInNav).toBe(true);
  });
});
