import { describe, it, expect } from "vitest";
import {
  makeBlurDataUrl,
  BRAND_PORTRAIT_BLUR,
  BRAND_LANDSCAPE_BLUR,
} from "./blur";

describe("makeBlurDataUrl", () => {
  it("returns a data URL with the SVG mime type", () => {
    const url = makeBlurDataUrl("portrait");
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("decodes to valid SVG containing the expected viewBox", () => {
    const url = makeBlurDataUrl("portrait");
    const b64 = url.split(",")[1]!;
    const svg = Buffer.from(b64, "base64").toString("utf-8");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 4 5"');
  });

  it("emits landscape viewBox when requested", () => {
    const url = makeBlurDataUrl("landscape");
    const svg = Buffer.from(url.split(",")[1]!, "base64").toString("utf-8");
    expect(svg).toContain('viewBox="0 0 5 4"');
  });

  it("supports a palette override", () => {
    const url = makeBlurDataUrl("portrait", { light: "#ff0000" });
    const svg = Buffer.from(url.split(",")[1]!, "base64").toString("utf-8");
    expect(svg).toContain("#ff0000");
  });

  it("BRAND_PORTRAIT_BLUR and BRAND_LANDSCAPE_BLUR differ by orientation", () => {
    expect(BRAND_PORTRAIT_BLUR).not.toBe(BRAND_LANDSCAPE_BLUR);
    expect(BRAND_PORTRAIT_BLUR.startsWith("data:image/svg+xml")).toBe(true);
    expect(BRAND_LANDSCAPE_BLUR.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("output is deterministic for identical inputs", () => {
    expect(makeBlurDataUrl("portrait")).toBe(makeBlurDataUrl("portrait"));
  });
});
