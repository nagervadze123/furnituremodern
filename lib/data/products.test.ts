import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted mocks. Vitest hoists vi.mock() above imports, so the mocked
// modules must be defined before any code from `./products` is imported.
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
  getProducts,
  getProductBySlug,
  getAllProductPaths,
} from "./products";

// Build a Supabase query builder stub whose terminal `await` resolves
// to { data, error }. The real client returns from .range/.limit/etc.
// after a chain of builder methods; the stub lets every chain method
// return `this` and resolves the promise via .then().
function makeQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order", "range", "limit"]) {
    chain[m] = () => chain;
  }
  // Make the chain itself awaitable.
  chain.then = (resolve: (v: typeof result) => unknown) => resolve(result);
  return chain;
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

describe("getProducts — Supabase failure fallback", () => {
  beforeEach(() => {
    isSupabaseConfiguredMock.mockReturnValue(true);
  });

  it("production: returns an empty list and forwards the error to logError (no placeholder data)", async () => {
    setNodeEnv("production");
    const error = { message: "RLS denied", code: "42501" };
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error }),
    });
    const result = await getProducts();
    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledOnce();
    const [errArg, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(errArg).toBe(error);
    expect(ctxArg?.route).toBe("lib/data/products:getProducts");
    expect(ctxArg?.scope).toBe("route");
  });

  it("development: falls back to local placeholder data (devs keep working through outages)", async () => {
    setNodeEnv("development");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "transient" } }),
    });
    const result = await getProducts();
    // Local fallback returns at least one row from content/products.ts.
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
    expect(result[0]).toHaveProperty("name");
    expect(logError).toHaveBeenCalledOnce();
  });

  it("production: returns the mapped Supabase rows when the query succeeds", async () => {
    setNodeEnv("production");
    createSupabasePublicClientMock.mockReturnValue({
      from: () =>
        makeQuery({
          data: [
            {
              id: "p-1",
              slug: "linen-three-seater",
              name_ka: "name ka",
              name_en: "name en",
              description_ka: "desc ka",
              description_en: "desc en",
              price: "1200.00",
              currency: "GEL",
              is_featured: true,
              is_published: true,
              sort_order: 0,
              updated_at: "2026-01-01T00:00:00Z",
              created_at: "2026-01-01T00:00:00Z",
              categories: { slug: "sofas" },
              product_images: [],
            },
          ],
          error: null,
        }),
    });
    const result = await getProducts();
    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe("linen-three-seater");
    expect(logError).not.toHaveBeenCalled();
  });
});

describe("getProductBySlug — Supabase failure fallback", () => {
  it("production: returns null and logs the error (no placeholder)", async () => {
    setNodeEnv("production");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    const result = await getProductBySlug("linen-three-seater");
    expect(result).toBeNull();
    expect(logError).toHaveBeenCalledOnce();
    const [, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(ctxArg?.route).toBe("lib/data/products:getProductBySlug");
  });

  it("development: returns the local placeholder when Supabase errors", async () => {
    setNodeEnv("development");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    // The local catalog seeded in content/products.ts contains
    // "linen-three-seater" so the fallback should resolve.
    const result = await getProductBySlug("linen-three-seater");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("linen-three-seater");
  });
});

describe("getAllProductPaths — Supabase failure fallback", () => {
  it("production: returns an empty list and logs (sitemap stays clean of stale URLs)", async () => {
    setNodeEnv("production");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    const result = await getAllProductPaths();
    expect(result).toEqual([]);
    expect(logError).toHaveBeenCalledOnce();
    const [, ctxArg] = vi.mocked(logError).mock.calls[0]!;
    expect(ctxArg?.route).toBe("lib/data/products:getAllProductPaths");
  });

  it("development: returns local catalog paths when Supabase errors", async () => {
    setNodeEnv("development");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    const result = await getAllProductPaths();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("category");
    expect(result[0]).toHaveProperty("slug");
  });
});
