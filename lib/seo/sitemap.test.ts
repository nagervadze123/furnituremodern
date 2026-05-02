import { describe, it, expect } from "vitest";
import { localizedSitemapEntry, toLastModified } from "./sitemap";

describe("localizedSitemapEntry", () => {
  it("emits one entry per supported locale", () => {
    const entries = localizedSitemapEntry("sofas", new Date(0));
    // routing.locales = ["ka", "en"] — 2 entries.
    expect(entries).toHaveLength(2);
  });

  it("includes both locales + x-default in alternates.languages", () => {
    const entries = localizedSitemapEntry("sofas", new Date(0));
    const langs = entries[0]!.alternates!.languages!;
    expect(Object.keys(langs).sort()).toEqual(["en", "ka", "x-default"]);
    // x-default must point at the default locale (ka).
    expect(langs["x-default"]).toBe(langs.ka);
  });

  it("emits unprefixed home for empty route", () => {
    const entries = localizedSitemapEntry("", new Date(0));
    for (const e of entries) {
      // URL must end with /ka or /en, never /sofas.
      expect(e.url).toMatch(/\/(ka|en)$/);
    }
  });

  it("normalizes leading and trailing slashes in route", () => {
    const trimmed = localizedSitemapEntry("/sofas/", new Date(0));
    const direct = localizedSitemapEntry("sofas", new Date(0));
    expect(trimmed[0]!.url).toBe(direct[0]!.url);
  });

  it("propagates lastModified to every locale entry", () => {
    const ts = new Date("2026-04-15T10:00:00.000Z");
    const entries = localizedSitemapEntry("sofas", ts);
    for (const e of entries) {
      expect(e.lastModified).toBe(ts);
    }
  });
});

describe("toLastModified", () => {
  const NOW = new Date("2026-05-02T12:00:00.000Z");

  it("returns now when input is undefined", () => {
    expect(toLastModified(undefined, NOW)).toBe(NOW);
  });

  it("returns now when input is empty string", () => {
    expect(toLastModified("", NOW)).toBe(NOW);
  });

  it("parses a valid ISO timestamp", () => {
    const out = toLastModified("2026-04-15T10:00:00.000Z", NOW);
    expect(out.toISOString()).toBe("2026-04-15T10:00:00.000Z");
  });

  it("returns now for an unparseable string", () => {
    expect(toLastModified("not a date", NOW)).toBe(NOW);
  });
});
