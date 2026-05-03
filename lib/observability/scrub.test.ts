// Tests for the Sentry beforeSend scrubbers. The scrubbers run inside
// the SDK's pre-transmission hook on every event; if they let any of
// the listed PII through to Sentry, we breach the privacy contract
// documented in CHECKLIST.md ("no PII in any analytics or
// observability event"). These tests are the assertion that scrubbers
// strip the known surface area before transmission.

import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { scrubServerEvent, scrubClientEvent } from "./scrub";

describe("scrubServerEvent", () => {
  it("removes user.ip_address", () => {
    const event: ErrorEvent = { type: undefined, user: { ip_address: "203.0.113.42", id: "u-1" } };
    const out = scrubServerEvent(event);
    expect(out?.user?.ip_address).toBeUndefined();
    // Non-PII identifiers untouched (not that we send them, but the
    // scrubber should be surgical, not nuclear).
    expect(out?.user?.id).toBe("u-1");
  });

  it("removes request.cookies", () => {
    const event: ErrorEvent = { type: undefined,
      request: {
        cookies: { session: "secret", csrf: "abc" },
        url: "https://example.com/page",
      },
    };
    const out = scrubServerEvent(event);
    expect(out?.request?.cookies).toBeUndefined();
  });

  it("removes IP-bearing request headers (x-forwarded-for, x-real-ip, forwarded, cf-connecting-ip)", () => {
    const event: ErrorEvent = { type: undefined,
      request: {
        headers: {
          "x-forwarded-for": "203.0.113.42, 198.51.100.1",
          "x-real-ip": "203.0.113.42",
          forwarded: 'for="203.0.113.42"',
          "cf-connecting-ip": "203.0.113.42",
          "user-agent": "Mozilla/5.0 (X11; Linux)",
          accept: "text/html",
        },
      },
    };
    const out = scrubServerEvent(event);
    const headers = out?.request?.headers ?? {};
    expect(headers["x-forwarded-for"]).toBeUndefined();
    expect(headers["x-real-ip"]).toBeUndefined();
    expect(headers["forwarded"]).toBeUndefined();
    expect(headers["cf-connecting-ip"]).toBeUndefined();
    // Non-IP headers preserved.
    expect(headers["accept"]).toBe("text/html");
  });

  it("removes user-agent (fingerprinting surface) from headers", () => {
    const event: ErrorEvent = { type: undefined,
      request: { headers: { "user-agent": "Mozilla/5.0" } },
    };
    const out = scrubServerEvent(event);
    expect(out?.request?.headers?.["user-agent"]).toBeUndefined();
  });

  it("returns the event when there is nothing to scrub", () => {
    const event: ErrorEvent = { type: undefined, message: "ok" };
    const out = scrubServerEvent(event);
    expect(out).toBeDefined();
    expect(out?.message).toBe("ok");
  });

  it("returns the event unchanged when request and user are absent", () => {
    const event: ErrorEvent = { type: undefined, exception: { values: [{ type: "Error" }] } };
    expect(() => scrubServerEvent(event)).not.toThrow();
  });
});

describe("scrubClientEvent", () => {
  it("strips URL query strings on request.url (might contain PII like ?email=)", () => {
    const event: ErrorEvent = { type: undefined,
      request: { url: "https://example.com/search?q=secret&email=a@b.c" },
    };
    const out = scrubClientEvent(event);
    expect(out?.request?.url).toBe("https://example.com/search");
  });

  it("preserves request.url with no query string", () => {
    const event: ErrorEvent = { type: undefined, request: { url: "https://example.com/page" } };
    const out = scrubClientEvent(event);
    expect(out?.request?.url).toBe("https://example.com/page");
  });

  it("strips Authorization headers on the client (defence in depth — should never leak)", () => {
    const event: ErrorEvent = { type: undefined,
      request: {
        headers: {
          authorization: "Bearer secret",
          Authorization: "Bearer secret",
          accept: "application/json",
        },
      },
    };
    const out = scrubClientEvent(event);
    const headers = out?.request?.headers ?? {};
    expect(headers["authorization"]).toBeUndefined();
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["accept"]).toBe("application/json");
  });

  it("also runs the server scrubbers (cookies, ip, user-agent, ip headers)", () => {
    const event: ErrorEvent = { type: undefined,
      user: { ip_address: "203.0.113.42" },
      request: {
        url: "https://example.com/?q=x",
        cookies: { session: "s" },
        headers: { "x-forwarded-for": "203.0.113.42" },
      },
    };
    const out = scrubClientEvent(event);
    expect(out?.user?.ip_address).toBeUndefined();
    expect(out?.request?.cookies).toBeUndefined();
    expect(out?.request?.headers?.["x-forwarded-for"]).toBeUndefined();
    expect(out?.request?.url).toBe("https://example.com/");
  });

  it("does not throw on malformed request.url", () => {
    const event: ErrorEvent = { type: undefined, request: { url: "not-a-valid-url" } };
    expect(() => scrubClientEvent(event)).not.toThrow();
  });
});
