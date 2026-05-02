import { describe, it, expect } from "vitest";
import { transliterate } from "./transliterate";

describe("transliterate (BGN/PCGN 1981, slug-mode)", () => {
  it("maps every modern Georgian letter", () => {
    const georgian = "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
    expect(transliterate(georgian)).toBe(
      "abgdevztiklmnopzhrstupkghqshchtsdztschkhjh"
    );
  });

  it("lowercases ASCII alongside Georgian", () => {
    expect(transliterate("ლინენი Sofa 3")).toBe("lineni-sofa-3");
  });

  it("collapses non-alphanumeric runs to single hyphens", () => {
    expect(transliterate("სამ – ადგილიანი დივანი!")).toBe("sam-adgiliani-divani");
  });

  it("trims leading and trailing hyphens", () => {
    expect(transliterate("---სავარძელი---")).toBe("savardzeli");
  });

  it("dedupes adjacent hyphens", () => {
    expect(transliterate("a -- b -- c")).toBe("a-b-c");
  });

  it("caps length at 80 characters and trims trailing hyphen if cap lands mid-word", () => {
    const long = "სავარძელი".repeat(20);
    const result = transliterate(long);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("-")).toBe(false);
  });

  it("returns empty string for input with no convertible characters", () => {
    expect(transliterate("...!!!")).toBe("");
    expect(transliterate("")).toBe("");
  });

  it("passes already-ASCII slugs through unchanged", () => {
    expect(transliterate("linen-three-seater")).toBe("linen-three-seater");
  });

  it("strips combining marks from accented Latin input", () => {
    expect(transliterate("café")).toBe("cafe");
    expect(transliterate("naïve")).toBe("naive");
    expect(transliterate("Žižek")).toBe("zizek");
  });

  it("handles mixed Georgian + Latin + digits", () => {
    expect(transliterate("ლინენი sofa 2024")).toBe("lineni-sofa-2024");
  });

  it("strips non-Georgian non-ASCII (e.g., Russian)", () => {
    expect(transliterate("Диван linen")).toBe("linen");
  });
});
