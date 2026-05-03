import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseStoredConsent,
  serializeConsent,
  writeConsent,
  getConsentServerSide,
  readConsentFromBrowser,
} from "./store";
import { CONSENT_COOKIE_MAX_AGE, CONSENT_COOKIE_NAME } from "./types";

describe("parseStoredConsent", () => {
  it("returns null for null, undefined, and empty string", () => {
    expect(parseStoredConsent(null)).toBeNull();
    expect(parseStoredConsent(undefined)).toBeNull();
    expect(parseStoredConsent("")).toBeNull();
  });

  it("migrates the legacy fixture 'accepted' to a granular all-true choice", () => {
    // legacy fixture
    const out = parseStoredConsent("accepted");
    expect(out).not.toBeNull();
    expect(out?.analytics).toBe(true);
    expect(out?.marketing).toBe(true);
    expect(typeof out?.updatedAt).toBe("string");
    expect((out?.updatedAt ?? "").length).toBeGreaterThan(0);
    expect(isNaN(new Date(out!.updatedAt).getTime())).toBe(false);
  });

  it("migrates the legacy fixture 'declined' to a granular all-false choice", () => {
    // legacy fixture
    const out = parseStoredConsent("declined");
    expect(out).not.toBeNull();
    expect(out?.analytics).toBe(false);
    expect(out?.marketing).toBe(false);
    expect(typeof out?.updatedAt).toBe("string");
    expect((out?.updatedAt ?? "").length).toBeGreaterThan(0);
    expect(isNaN(new Date(out!.updatedAt).getTime())).toBe(false);
  });

  it("accepts well-formed JSON and round-trips exactly", () => {
    const raw =
      '{"analytics":true,"marketing":false,"updatedAt":"2026-05-02T00:00:00.000Z"}';
    const out = parseStoredConsent(raw);
    expect(out).toEqual({
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-02T00:00:00.000Z",
    });
  });

  it("rejects arbitrary non-JSON text and empty objects", () => {
    expect(parseStoredConsent("not-json")).toBeNull();
    expect(parseStoredConsent("{}")).toBeNull();
  });

  it("rejects values with wrong types or missing keys", () => {
    expect(
      parseStoredConsent(
        '{"analytics":"yes","marketing":false,"updatedAt":"x"}'
      )
    ).toBeNull();
    expect(
      parseStoredConsent('{"analytics":true,"marketing":false}')
    ).toBeNull();
  });

  it("rejects values with unknown extra keys", () => {
    expect(
      parseStoredConsent(
        '{"analytics":true,"marketing":false,"updatedAt":"x","extra":1}'
      )
    ).toBeNull();
  });

  it("rejects an empty updatedAt string", () => {
    expect(
      parseStoredConsent(
        '{"analytics":true,"marketing":false,"updatedAt":""}'
      )
    ).toBeNull();
  });

  it("never throws on malformed input", () => {
    expect(() => parseStoredConsent("[")).not.toThrow();
    expect(() => parseStoredConsent("{")).not.toThrow();
    expect(() => parseStoredConsent('"a string"')).not.toThrow();
    expect(() => parseStoredConsent("null")).not.toThrow();
    expect(() => parseStoredConsent("[]")).not.toThrow();
  });
});

describe("serializeConsent", () => {
  it("round-trips through parseStoredConsent and emits a JSON string", () => {
    const choice = {
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-02T12:34:56.000Z",
    };
    const serialized = serializeConsent(choice);
    expect(typeof serialized).toBe("string");
    expect(parseStoredConsent(serialized)).toEqual(choice);
  });
});

describe("writeConsent (with injected deps)", () => {
  it("writes a cookie starting with fm_consent= followed by URL-encoded JSON", () => {
    const writeCookie = vi.fn();
    const emitChange = vi.fn();
    const fixedNow = new Date("2026-05-02T00:00:00.000Z");

    writeConsent(
      { analytics: true, marketing: false },
      { now: () => fixedNow, writeCookie, emitChange }
    );

    expect(writeCookie).toHaveBeenCalledTimes(1);
    const written = writeCookie.mock.calls[0]![0] as string;
    expect(written.startsWith(`${CONSENT_COOKIE_NAME}=`)).toBe(true);
    const valuePart = written
      .split("; ")[0]!
      .slice(`${CONSENT_COOKIE_NAME}=`.length);
    expect(decodeURIComponent(valuePart)).toBe(
      '{"analytics":true,"marketing":false,"updatedAt":"2026-05-02T00:00:00.000Z"}'
    );
  });

  it("includes Max-Age, Path, and SameSite attributes", () => {
    const writeCookie = vi.fn();
    writeConsent(
      { analytics: false, marketing: false },
      {
        now: () => new Date("2026-05-02T00:00:00.000Z"),
        writeCookie,
        emitChange: () => {},
      }
    );
    const written = writeCookie.mock.calls[0]![0] as string;
    expect(written).toContain(`Max-Age=${CONSENT_COOKIE_MAX_AGE}`);
    expect(written).toContain("Max-Age=31536000");
    expect(written).toContain("Path=/");
    expect(written).toContain("SameSite=Lax");
  });

  it("does not include Secure when no window is available", () => {
    const writeCookie = vi.fn();
    writeConsent(
      { analytics: true, marketing: true },
      {
        now: () => new Date("2026-05-02T00:00:00.000Z"),
        writeCookie,
        emitChange: () => {},
      }
    );
    const written = writeCookie.mock.calls[0]![0] as string;
    expect(written).not.toContain("Secure");
  });

  it("returns a ConsentChoice whose updatedAt matches the injected now", () => {
    const fixedNow = new Date("2026-05-02T11:22:33.000Z");
    const out = writeConsent(
      { analytics: true, marketing: false },
      {
        now: () => fixedNow,
        writeCookie: () => {},
        emitChange: () => {},
      }
    );
    expect(out.analytics).toBe(true);
    expect(out.marketing).toBe(false);
    expect(out.updatedAt).toBe(fixedNow.toISOString());
  });

  it("calls emitChange exactly once with the returned ConsentChoice", () => {
    const emitChange = vi.fn();
    const out = writeConsent(
      { analytics: false, marketing: true },
      {
        now: () => new Date("2026-05-02T00:00:00.000Z"),
        writeCookie: () => {},
        emitChange,
      }
    );
    expect(emitChange).toHaveBeenCalledTimes(1);
    expect(emitChange).toHaveBeenCalledWith(out);
  });

  it("produces a cookie value that parses back to the returned choice", () => {
    const writeCookie = vi.fn();
    const out = writeConsent(
      { analytics: true, marketing: true },
      {
        now: () => new Date("2026-05-02T00:00:00.000Z"),
        writeCookie,
        emitChange: () => {},
      }
    );
    const written = writeCookie.mock.calls[0]![0] as string;
    const valuePart = written
      .split("; ")[0]!
      .slice(`${CONSENT_COOKIE_NAME}=`.length);
    const decoded = decodeURIComponent(valuePart);
    expect(parseStoredConsent(decoded)).toEqual(out);
  });
});

describe("getConsentServerSide", () => {
  it("returns null for undefined and delegates parsing for valid JSON", () => {
    expect(getConsentServerSide(undefined)).toBeNull();
    const raw =
      '{"analytics":false,"marketing":true,"updatedAt":"2026-05-02T00:00:00.000Z"}';
    expect(getConsentServerSide(raw)).toEqual({
      analytics: false,
      marketing: true,
      updatedAt: "2026-05-02T00:00:00.000Z",
    });
  });

  it("delegates legacy migration for the binary 'accepted' value", () => {
    // legacy fixture
    const out = getConsentServerSide("accepted");
    expect(out?.analytics).toBe(true);
    expect(out?.marketing).toBe(true);
    expect(typeof out?.updatedAt).toBe("string");
  });
});

describe("readConsentFromBrowser snapshot stability", () => {
  // Regression: parseStoredConsent constructs a fresh object on every
  // call, so without caching readConsentFromBrowser() would return a
  // different reference each render. useSyncExternalStore diffs with
  // Object.is and would loop forever, crashing the renderer the moment
  // a cookie is set. These tests pin the cache invariant.
  const originalDocument = (globalThis as { document?: unknown }).document;

  afterEach(() => {
    if (originalDocument === undefined) {
      // @ts-expect-error — restore SSR-like state
      delete globalThis.document;
    } else {
      // @ts-expect-error — restore real document
      globalThis.document = originalDocument;
    }
  });

  it("returns the same reference on consecutive calls when the cookie is unchanged", () => {
    const json = JSON.stringify({
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-03T00:00:00.000Z",
    });
    // @ts-expect-error — synthetic document
    globalThis.document = { cookie: `fm_consent=${encodeURIComponent(json)}` };

    const a = readConsentFromBrowser();
    const b = readConsentFromBrowser();
    const c = readConsentFromBrowser();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("returns null on consecutive calls when no consent cookie is set", () => {
    // @ts-expect-error — synthetic document with empty cookie
    globalThis.document = { cookie: "" };
    expect(readConsentFromBrowser()).toBeNull();
    expect(readConsentFromBrowser()).toBeNull();
  });

  it("returns the legacy-migrated reference stably for repeated reads of an 'accepted' cookie", () => {
    // legacy fixture: the parser builds a new ConsentChoice with a
    // fresh updatedAt every parse — without caching this would change
    // reference every call.
    // @ts-expect-error — synthetic document
    globalThis.document = { cookie: "fm_consent=accepted" };
    const a = readConsentFromBrowser();
    const b = readConsentFromBrowser();
    expect(a?.analytics).toBe(true);
    expect(a).toBe(b);
  });

  it("returns a new reference after the cookie value changes", () => {
    // @ts-expect-error — synthetic document
    globalThis.document = {
      cookie: `fm_consent=${encodeURIComponent(
        JSON.stringify({
          analytics: true,
          marketing: true,
          updatedAt: "2026-05-03T00:00:00.000Z",
        })
      )}`,
    };
    const a = readConsentFromBrowser();

    // @ts-expect-error — synthetic document
    globalThis.document = {
      cookie: `fm_consent=${encodeURIComponent(
        JSON.stringify({
          analytics: false,
          marketing: false,
          updatedAt: "2026-05-03T01:00:00.000Z",
        })
      )}`,
    };
    const b = readConsentFromBrowser();

    expect(a).not.toBe(b);
    expect(a?.analytics).toBe(true);
    expect(b?.analytics).toBe(false);
  });

  it("clears the cached snapshot when the cookie is removed", () => {
    // @ts-expect-error — synthetic document
    globalThis.document = {
      cookie: `fm_consent=${encodeURIComponent(
        JSON.stringify({
          analytics: true,
          marketing: false,
          updatedAt: "2026-05-03T00:00:00.000Z",
        })
      )}`,
    };
    expect(readConsentFromBrowser()).not.toBeNull();

    // @ts-expect-error — synthetic empty cookie
    globalThis.document = { cookie: "" };
    expect(readConsentFromBrowser()).toBeNull();
  });
});
