import { describe, it, expect } from "vitest";
import {
  createRateLimiter,
  isBrowserExtensionReport,
  parseCspReport,
  stripQueryAndFragment,
} from "./csp-report";

describe("stripQueryAndFragment", () => {
  it("returns the input unchanged when no query or fragment", () => {
    expect(stripQueryAndFragment("https://example.com/foo")).toBe(
      "https://example.com/foo"
    );
  });

  it("strips the query string", () => {
    expect(stripQueryAndFragment("https://example.com/foo?session=abc")).toBe(
      "https://example.com/foo"
    );
  });

  it("strips the fragment", () => {
    expect(stripQueryAndFragment("https://example.com/foo#section")).toBe(
      "https://example.com/foo"
    );
  });

  it("strips both query and fragment", () => {
    expect(
      stripQueryAndFragment("https://example.com/foo?session=abc#section")
    ).toBe("https://example.com/foo");
  });

  it("handles bare paths", () => {
    expect(stripQueryAndFragment("/ka/sofas?utm=x")).toBe("/ka/sofas");
  });

  it("handles non-URL-shaped strings gracefully", () => {
    expect(stripQueryAndFragment("about:srcdoc")).toBe("about:srcdoc");
  });
});

describe("isBrowserExtensionReport", () => {
  it("returns true for chrome-extension:// URIs", () => {
    expect(
      isBrowserExtensionReport("chrome-extension://abc123/content.js")
    ).toBe(true);
  });

  it("returns true for moz-extension:// URIs", () => {
    expect(
      isBrowserExtensionReport("moz-extension://uuid-here/script.js")
    ).toBe(true);
  });

  it("returns true for safari-web-extension:// URIs", () => {
    expect(
      isBrowserExtensionReport("safari-web-extension://abc/content.js")
    ).toBe(true);
  });

  it("is case-insensitive on the scheme", () => {
    expect(
      isBrowserExtensionReport("CHROME-EXTENSION://abc/content.js")
    ).toBe(true);
  });

  it("returns false for https:// URIs", () => {
    expect(isBrowserExtensionReport("https://example.com/script.js")).toBe(
      false
    );
  });

  it("returns false for inline keyword", () => {
    expect(isBrowserExtensionReport("inline")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isBrowserExtensionReport(null)).toBe(false);
  });

  it("returns false for a path that merely contains 'chrome-extension'", () => {
    // Defensive: a hostile reporter could set the value to a string
    // that contains the substring without being the scheme. We match
    // on startsWith to avoid that confusion.
    expect(
      isBrowserExtensionReport("https://example.com/chrome-extension/foo")
    ).toBe(false);
  });
});

describe("parseCspReport — legacy report-uri shape", () => {
  it("parses a typical legacy report", () => {
    const raw = {
      "csp-report": {
        "document-uri": "https://furnituremodern.vercel.app/ka/sofas",
        referrer: "https://google.com/",
        "violated-directive": "style-src",
        "effective-directive": "style-src-elem",
        "original-policy": "default-src 'self'",
        "blocked-uri": "inline",
        disposition: "report",
        "source-file": "https://furnituremodern.vercel.app/ka/sofas",
        "line-number": 42,
        "column-number": 10,
        "script-sample": "color: red",
        "status-code": 200,
      },
    };
    const result = parseCspReport(raw);
    expect(result).not.toBeNull();
    expect(result?.disposition).toBe("report");
    expect(result?.documentUri).toBe(
      "https://furnituremodern.vercel.app/ka/sofas"
    );
    expect(result?.violatedDirective).toBe("style-src");
    expect(result?.effectiveDirective).toBe("style-src-elem");
    expect(result?.blockedUri).toBe("inline");
    expect(result?.lineNumber).toBe(42);
    expect(result?.columnNumber).toBe(10);
    expect(result?.scriptSample).toBe("color: red");
  });

  it("strips query string from document-uri", () => {
    const raw = {
      "csp-report": {
        "document-uri":
          "https://furnituremodern.vercel.app/ka?session=secret",
        "violated-directive": "style-src",
      },
    };
    const result = parseCspReport(raw);
    expect(result?.documentUri).toBe("https://furnituremodern.vercel.app/ka");
  });

  it("defaults disposition to 'report' when omitted", () => {
    const raw = {
      "csp-report": {
        "document-uri": "https://example.com/foo",
        "violated-directive": "img-src",
      },
    };
    const result = parseCspReport(raw);
    expect(result?.disposition).toBe("report");
  });

  it("falls back to effective-directive when violated-directive is missing", () => {
    const raw = {
      "csp-report": {
        "document-uri": "https://example.com/foo",
        "effective-directive": "style-src-elem",
      },
    };
    const result = parseCspReport(raw);
    expect(result?.violatedDirective).toBe("style-src-elem");
  });

  it("returns null when document-uri is missing", () => {
    const raw = {
      "csp-report": {
        "violated-directive": "style-src",
      },
    };
    expect(parseCspReport(raw)).toBeNull();
  });

  it("returns null when both directive fields are missing", () => {
    const raw = {
      "csp-report": {
        "document-uri": "https://example.com/foo",
      },
    };
    expect(parseCspReport(raw)).toBeNull();
  });

  it("returns null on totally malformed input", () => {
    expect(parseCspReport({ random: "junk" })).toBeNull();
    expect(parseCspReport(null)).toBeNull();
    expect(parseCspReport("string")).toBeNull();
  });
});

describe("parseCspReport — modern Reporting-API shape", () => {
  it("parses a typical modern report (array of one)", () => {
    const raw = [
      {
        type: "csp-violation",
        url: "https://furnituremodern.vercel.app/ka",
        body: {
          documentURL: "https://furnituremodern.vercel.app/ka",
          referrer: "",
          blockedURL: "inline",
          effectiveDirective: "style-src-elem",
          originalPolicy: "default-src 'self'",
          sourceFile: "https://furnituremodern.vercel.app/ka",
          lineNumber: 1,
          columnNumber: 1,
          sample: "color: red",
          disposition: "report",
          statusCode: 200,
        },
      },
    ];
    const result = parseCspReport(raw);
    expect(result).not.toBeNull();
    expect(result?.documentUri).toBe("https://furnituremodern.vercel.app/ka");
    expect(result?.violatedDirective).toBe("style-src-elem");
    expect(result?.effectiveDirective).toBe("style-src-elem");
    expect(result?.blockedUri).toBe("inline");
    expect(result?.scriptSample).toBe("color: red");
  });

  it("picks the first csp-violation entry from a batched report", () => {
    const raw = [
      // Browsers may batch other report types; we ignore them.
      { type: "deprecation", url: "https://x", body: { id: "foo" } },
      {
        type: "csp-violation",
        url: "https://x/page",
        body: {
          documentURL: "https://x/page",
          effectiveDirective: "img-src",
        },
      },
    ];
    const result = parseCspReport(raw);
    expect(result?.violatedDirective).toBe("img-src");
  });

  it("returns null when no csp-violation entry is present", () => {
    const raw = [
      { type: "deprecation", url: "https://x", body: { id: "foo" } },
    ];
    expect(parseCspReport(raw)).toBeNull();
  });

  it("falls back to entry url when documentURL is missing on the body", () => {
    const raw = [
      {
        type: "csp-violation",
        url: "https://x/page",
        body: {
          effectiveDirective: "style-src-elem",
        },
      },
    ];
    const result = parseCspReport(raw);
    expect(result?.documentUri).toBe("https://x/page");
  });

  it("returns null on an empty modern array", () => {
    expect(parseCspReport([])).toBeNull();
  });
});

describe("createRateLimiter (csp-report bucket)", () => {
  // Exact same shape as lib/api/log-404.test.ts — copied so a
  // regression in one limiter is caught even if the other passes.
  it("allows the first 100 calls in a 60s window", () => {
    const limiter = createRateLimiter({
      max: 100,
      windowMs: 60_000,
      now: () => 0,
    });
    for (let i = 0; i < 100; i++) {
      expect(limiter("1.2.3.4")).toBe(true);
    }
    expect(limiter("1.2.3.4")).toBe(false);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 1000,
      now: () => t,
    });
    expect(limiter("ip")).toBe(true);
    expect(limiter("ip")).toBe(true);
    expect(limiter("ip")).toBe(false);
    t = 1500;
    expect(limiter("ip")).toBe(true);
  });

  it("isolates buckets per IP", () => {
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 1000,
      now: () => 0,
    });
    expect(limiter("a")).toBe(true);
    expect(limiter("a")).toBe(false);
    expect(limiter("b")).toBe(true);
  });
});
