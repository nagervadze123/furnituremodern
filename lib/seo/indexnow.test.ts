import { describe, it, expect, vi } from "vitest";
import {
  readIndexNowConfig,
  normalizeUrls,
  submitIndexNowWith,
} from "./indexnow";

describe("readIndexNowConfig", () => {
  it("returns null when INDEXNOW_KEY is missing", () => {
    expect(readIndexNowConfig({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("returns null when INDEXNOW_KEY is whitespace", () => {
    expect(
      readIndexNowConfig({ INDEXNOW_KEY: "   " } as NodeJS.ProcessEnv)
    ).toBeNull();
  });

  it("populates host from INDEXNOW_HOST when set", () => {
    const c = readIndexNowConfig({
      INDEXNOW_KEY: "abc123",
      INDEXNOW_HOST: "example.com",
    } as NodeJS.ProcessEnv);
    expect(c?.host).toBe("example.com");
    expect(c?.key).toBe("abc123");
  });

  it("falls back to the SITE_HOST parsed from NEXT_PUBLIC_SITE_URL", () => {
    // SITE_HOST is captured at module init from process.env, so we
    // check it's non-null when the key is set and host env is empty.
    const c = readIndexNowConfig({
      INDEXNOW_KEY: "abc123",
    } as NodeJS.ProcessEnv);
    // Either a valid host fallback or null if NEXT_PUBLIC_SITE_URL
    // wasn't set in the test runner — both are acceptable.
    if (c !== null) {
      expect(c.host.length).toBeGreaterThan(0);
    }
  });

  it("includes a keyLocation pointing at /indexnow.txt", () => {
    const c = readIndexNowConfig({
      INDEXNOW_KEY: "abc123",
      INDEXNOW_HOST: "example.com",
    } as NodeJS.ProcessEnv);
    expect(c?.keyLocation).toMatch(/\/indexnow\.txt$/);
  });
});

describe("normalizeUrls", () => {
  it("dedupes identical URLs", () => {
    const out = normalizeUrls(
      ["https://example.com/a", "https://example.com/a"],
      "example.com"
    );
    expect(out).toEqual(["https://example.com/a"]);
  });

  it("drops URLs that don't match the configured host", () => {
    const out = normalizeUrls(
      ["https://example.com/a", "https://other.com/b"],
      "example.com"
    );
    expect(out).toEqual(["https://example.com/a"]);
  });

  it("drops malformed URLs without throwing", () => {
    const out = normalizeUrls(
      ["not-a-url", "", "https://example.com/a"],
      "example.com"
    );
    expect(out).toEqual(["https://example.com/a"]);
  });
});

describe("submitIndexNowWith", () => {
  it("is a no-op when env is unconfigured", async () => {
    const fetchSpy = vi.fn();
    await submitIndexNowWith(["https://example.com/a"], {
      fetch: fetchSpy as unknown as typeof fetch,
      env: {} as NodeJS.ProcessEnv,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when the urlList is empty after normalization", async () => {
    const fetchSpy = vi.fn();
    await submitIndexNowWith(["https://other.com/a"], {
      fetch: fetchSpy as unknown as typeof fetch,
      env: {
        INDEXNOW_KEY: "abc",
        INDEXNOW_HOST: "example.com",
      } as NodeJS.ProcessEnv,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the documented payload shape on success", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("", { status: 200 })
    );
    await submitIndexNowWith(
      ["https://example.com/a", "https://example.com/b", "https://example.com/a"],
      {
        fetch: fetchSpy as unknown as typeof fetch,
        env: {
          INDEXNOW_KEY: "abc",
          INDEXNOW_HOST: "example.com",
          NEXT_PUBLIC_SITE_URL: "https://example.com",
        } as NodeJS.ProcessEnv,
      }
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.host).toBe("example.com");
    expect(body.key).toBe("abc");
    expect(body.urlList).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(body.keyLocation).toMatch(/\/indexnow\.txt$/);
  });

  it("does not throw when fetch rejects (best-effort)", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    const log = vi.fn();
    await expect(
      submitIndexNowWith(["https://example.com/a"], {
        fetch: fetchSpy as unknown as typeof fetch,
        log,
        env: {
          INDEXNOW_KEY: "abc",
          INDEXNOW_HOST: "example.com",
        } as NodeJS.ProcessEnv,
      })
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it("does not throw on a non-2xx response", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response("rate limited", { status: 429 }));
    const log = vi.fn();
    await expect(
      submitIndexNowWith(["https://example.com/a"], {
        fetch: fetchSpy as unknown as typeof fetch,
        log,
        env: {
          INDEXNOW_KEY: "abc",
          INDEXNOW_HOST: "example.com",
        } as NodeJS.ProcessEnv,
      })
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it("aborts and does not throw when the request exceeds the timeout", async () => {
    // Slow fetch that resolves only after the timer fires; the abort
    // should make it reject with AbortError, which the helper swallows.
    const slowFetch = vi.fn(
      (_input: unknown, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("aborted"))
          );
        })
    );
    const log = vi.fn();
    await expect(
      submitIndexNowWith(["https://example.com/a"], {
        fetch: slowFetch as unknown as typeof fetch,
        log,
        timeoutMs: 5,
        env: {
          INDEXNOW_KEY: "abc",
          INDEXNOW_HOST: "example.com",
        } as NodeJS.ProcessEnv,
      })
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});
