import { describe, it, expect, vi } from "vitest";
import {
  parseStoredConsent,
  serializeConsent,
  writeConsent,
  getConsentServerSide,
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

describe("useConsent", () => {
  it.skip("hook behavior is exercised indirectly", () => {
    // The vitest config uses `environment: "node"` and the
    // `lib/**/*.test.ts` glob; running React's `useSyncExternalStore`
    // would need a jsdom environment plus React Testing Library wiring,
    // both of which are out of scope for the consent-core task. The
    // hook's logic is exercised indirectly through the
    // `parseStoredConsent` and `writeConsent` test blocks above.
  });
});
