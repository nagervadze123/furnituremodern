import { describe, it, expect } from "vitest";
import { slugify, isValidSlug } from "./slug";

describe("slugify (regression guards)", () => {
  it("preserves historical ASCII output", () => {
    expect(slugify("Linen Sofa 3")).toBe("linen-sofa-3");
    expect(slugify("Foo Bar 2024")).toBe("foo-bar-2024");
  });

  it("strips accented Latin diacritics", () => {
    expect(slugify("café")).toBe("cafe");
    expect(slugify("naïve")).toBe("naive");
  });

  it("transliterates Georgian", () => {
    expect(slugify("ლინენი sofa 2024")).toBe("lineni-sofa-2024");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("foo")).toBe(true);
    expect(isValidSlug("foo-bar")).toBe(true);
    expect(isValidSlug("foo-bar-2024")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Foo")).toBe(false);
    expect(isValidSlug("foo bar")).toBe(false);
    expect(isValidSlug("-foo")).toBe(false);
    expect(isValidSlug("foo-")).toBe(false);
    expect(isValidSlug("foo--bar")).toBe(false);
  });
});
