// Integration tests for the CSP report route handler.
//
// We mock the side effects (observability + supabase) so the test
// runs without a live Sentry DSN or Supabase project. The Zod parsing
// + rate limiter + extension filter are exercised through the real
// handler — no mocks for those.
//
// Each test uses a unique IP so the module-scoped rate-limiter Map
// (which persists for the test file's lifetime) doesn't accidentally
// leak state between tests.

import { describe, it, expect, vi, beforeEach } from "vitest";

const logEventMock = vi.fn();
const supabaseInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/observability", () => ({
  logEvent: (...args: unknown[]) => logEventMock(...args),
  logError: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ insert: supabaseInsertMock }),
  }),
}));

vi.mock("@/lib/supabase/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/env")>();
  return {
    ...actual,
    isSupabaseConfigured: () => true,
  };
});

// Dynamic import after mocks are registered so the route picks up
// the mocked dependencies on first import.
async function loadRoute() {
  return import("./route");
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    "csp-report": {
      "document-uri": "https://furnituremodern.vercel.app/ka",
      "violated-directive": "style-src-elem",
      "effective-directive": "style-src-elem",
      "blocked-uri": "inline",
      "original-policy": "default-src 'self'",
      disposition: "report",
      ...overrides,
    },
  };
}

function makeRequest(body: unknown, ip: string): Request {
  return new Request("https://furnituremodern.vercel.app/api/csp-report", {
    method: "POST",
    headers: {
      "content-type": "application/csp-report",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  logEventMock.mockClear();
  supabaseInsertMock.mockClear();
});

describe("POST /api/csp-report", () => {
  it("returns 204 for a valid legacy report", async () => {
    const { POST } = await loadRoute();
    const response = await POST(makeRequest(makeReport(), "10.0.0.1"));
    expect(response.status).toBe(204);
  });

  it("forwards a valid report to logEvent with the canonical shape", async () => {
    const { POST } = await loadRoute();
    await POST(makeRequest(makeReport(), "10.0.0.2"));
    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock).toHaveBeenCalledWith(
      "csp_violation",
      expect.objectContaining({
        violatedDirective: "style-src-elem",
        documentUri: "https://furnituremodern.vercel.app/ka",
        blockedUri: "inline",
      })
    );
  });

  it("inserts a csp_violations row when Supabase is configured", async () => {
    const { POST } = await loadRoute();
    await POST(makeRequest(makeReport(), "10.0.0.3"));
    expect(supabaseInsertMock).toHaveBeenCalledTimes(1);
    expect(supabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        violated_directive: "style-src-elem",
        document_uri: "https://furnituremodern.vercel.app/ka",
        disposition: "report",
      })
    );
  });

  it("returns 400 on invalid JSON", async () => {
    const { POST } = await loadRoute();
    const request = new Request(
      "https://furnituremodern.vercel.app/api/csp-report",
      {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
          "x-forwarded-for": "10.0.0.4",
        },
        body: "not-json",
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a body that doesn't match either CSP shape", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      makeRequest({ random: "garbage" }, "10.0.0.5")
    );
    expect(response.status).toBe(400);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("silently filters chrome-extension reports (204 + no logEvent)", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      makeRequest(
        makeReport({
          "blocked-uri": "chrome-extension://abc123/inject.js",
        }),
        "10.0.0.6"
      )
    );
    expect(response.status).toBe(204);
    expect(logEventMock).not.toHaveBeenCalled();
    expect(supabaseInsertMock).not.toHaveBeenCalled();
  });

  it("silently filters moz-extension reports", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      makeRequest(
        makeReport({ "blocked-uri": "moz-extension://uuid/script.js" }),
        "10.0.0.7"
      )
    );
    expect(response.status).toBe(204);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("accepts the modern Reporting-API array shape", async () => {
    const { POST } = await loadRoute();
    const modernBody = [
      {
        type: "csp-violation",
        url: "https://furnituremodern.vercel.app/ka",
        body: {
          documentURL: "https://furnituremodern.vercel.app/ka",
          effectiveDirective: "style-src-elem",
          blockedURL: "inline",
          disposition: "report",
        },
      },
    ];
    const response = await POST(makeRequest(modernBody, "10.0.0.8"));
    expect(response.status).toBe(204);
    expect(logEventMock).toHaveBeenCalledWith(
      "csp_violation",
      expect.objectContaining({ violatedDirective: "style-src-elem" })
    );
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const { POST } = await loadRoute();
    // 100 within-window calls succeed (or hit the path), the 101st
    // returns 429. Use a unique IP so the bucket is isolated from
    // every other test in this file.
    const ip = "10.0.0.99";
    for (let i = 0; i < 100; i++) {
      const ok = await POST(makeRequest(makeReport(), ip));
      expect(ok.status).toBe(204);
    }
    const blocked = await POST(makeRequest(makeReport(), ip));
    expect(blocked.status).toBe(429);
  });
});
