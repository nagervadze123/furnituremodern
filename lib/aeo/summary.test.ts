import { describe, it, expect } from "vitest";
import {
  homeAeoSummary,
  categoryAeoSummary,
  formatLastUpdated,
} from "./summary";

describe("homeAeoSummary", () => {
  it("renders Georgian copy under ka", () => {
    const s = homeAeoSummary("ka");
    expect(s.heading).toBe("მოკლე მიმოხილვა");
    expect(s.paragraph).toMatch(/თბილის/);
    // Categories must be referenced by their Georgian names.
    const facts = s.facts.find((f) => f.label === "კატეგორიები");
    expect(facts?.value).toBeTruthy();
    expect(facts?.value).toMatch(/[ა-ჰ]/);
  });

  it("renders English copy under en", () => {
    const s = homeAeoSummary("en");
    expect(s.heading).toBe("At a glance");
    expect(s.paragraph).toMatch(/Tbilisi/);
    expect(s.facts.find((f) => f.label === "Languages")?.value).toBe(
      "Georgian, English"
    );
  });
});

describe("categoryAeoSummary", () => {
  it("includes the actual item count", () => {
    const s = categoryAeoSummary("sofas", "en", 6);
    expect(s.facts.find((f) => f.label === "Item count")?.value).toBe("6");
    expect(s.paragraph).toMatch(/6 items/);
  });

  it("uses singular form when item count is 1", () => {
    const s = categoryAeoSummary("sofas", "en", 1);
    expect(s.paragraph).toMatch(/1 item\b/);
  });

  it("renders Georgian when locale is ka", () => {
    const s = categoryAeoSummary("sofas", "ka", 6);
    expect(s.facts.find((f) => f.label === "კატეგორია")?.value).toBe("დივნები");
  });

  it("throws on an unknown category slug (defensive)", () => {
    expect(() =>
      categoryAeoSummary("unknown" as never, "en", 0)
    ).toThrow();
  });
});

describe("formatLastUpdated", () => {
  it("formats an ISO date for English locale", () => {
    const out = formatLastUpdated("2026-04-15T10:00:00.000Z", "en");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/April|Apr/);
  });

  it("returns empty string for an invalid date", () => {
    expect(formatLastUpdated("not-a-date", "en")).toBe("");
  });
});
