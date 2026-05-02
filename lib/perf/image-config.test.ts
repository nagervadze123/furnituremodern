import { describe, it, expect } from "vitest";
import { buildImagesConfig } from "./image-config";

describe("buildImagesConfig", () => {
  it("emits AVIF before WebP so browsers pick the smaller format first", () => {
    const cfg = buildImagesConfig(undefined);
    expect(cfg.formats).toEqual(["image/avif", "image/webp"]);
  });

  it("sets a 1-year minimumCacheTTL on optimized image variants", () => {
    const cfg = buildImagesConfig(undefined);
    expect(cfg.minimumCacheTTL).toBe(31_536_000);
  });

  it("includes calibrated phone widths (360/375/414) in deviceSizes", () => {
    const cfg = buildImagesConfig(undefined);
    expect(cfg.deviceSizes).toContain(360);
    expect(cfg.deviceSizes).toContain(375);
    expect(cfg.deviceSizes).toContain(414);
    expect(cfg.deviceSizes).toContain(768);
    expect(cfg.deviceSizes).toContain(1024);
    expect(cfg.deviceSizes).toContain(1280);
    expect(cfg.deviceSizes).toContain(1536);
  });

  it("imageSizes are trimmed to thumbnail/card range", () => {
    const cfg = buildImagesConfig(undefined);
    expect(cfg.imageSizes).toEqual([16, 32, 48, 64, 96, 128, 256, 384]);
  });

  it("locks remotePatterns to picsum hosts when Supabase is unconfigured", () => {
    const cfg = buildImagesConfig(undefined);
    const hosts = cfg.remotePatterns?.map((p) => p.hostname);
    expect(hosts).toEqual(["picsum.photos", "fastly.picsum.photos"]);
  });

  it("appends the Supabase host (host only, no port/path) when configured", () => {
    const cfg = buildImagesConfig("https://abcd1234.supabase.co");
    const hosts = cfg.remotePatterns?.map((p) => p.hostname);
    expect(hosts).toContain("abcd1234.supabase.co");
  });

  it("does not allow wildcard hosts", () => {
    const cfg = buildImagesConfig("https://abcd1234.supabase.co");
    for (const p of cfg.remotePatterns ?? []) {
      expect(p.hostname).not.toContain("*");
      expect(p.protocol).toBe("https");
    }
  });
});
