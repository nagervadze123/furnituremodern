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
import { getCategories, getCategoryBySlug } from "./categories";

function makeQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = () => chain;
  }
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

describe("getCategories — Supabase failure fallback", () => {
  it("production: returns an empty list and logs (no placeholder data)", async () => {
    setNodeEnv("production");
    const error = { message: "RLS denied", code: "42501" };
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error }),
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
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    const result = await getCategories();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
    expect(logError).toHaveBeenCalledOnce();
  });
});

describe("getCategoryBySlug — Supabase failure fallback", () => {
  it("production: returns null and logs (no placeholder)", async () => {
    setNodeEnv("production");
    createSupabasePublicClientMock.mockReturnValue({
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
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
      from: () => makeQuery({ data: null, error: { message: "boom" } }),
    });
    const result = await getCategoryBySlug("sofas");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("sofas");
  });
});
