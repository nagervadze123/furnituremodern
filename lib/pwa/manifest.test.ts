import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "@/app/manifest";

const PUBLIC = resolve(__dirname, "../../public");

// Files the manifest, layout metadata, or service worker reference.
// If we add a reference, we add the file to this list — the test then
// catches a future regression where someone deletes a referenced asset
// without updating every consumer.
const REQUIRED_PUBLIC_FILES = [
  "icon.svg",
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "offline.html",
  "sw.js",
];

describe("PWA manifest", () => {
  const m = manifest();

  it("declares the Georgian default locale as start_url", () => {
    expect(m.start_url).toBe("/ka");
  });

  it("scopes to the whole origin", () => {
    expect(m.scope).toBe("/");
  });

  it("declares standalone display + ka-GE language", () => {
    expect(m.display).toBe("standalone");
    expect(m.lang).toBe("ka-GE");
  });

  it("carries name, short_name, description, theme + background colours", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.description).toBeTruthy();
    expect(m.theme_color).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  it("includes both an `any` and a `maskable` icon", () => {
    const icons = m.icons ?? [];
    const any = icons.some((i) => !i.purpose || i.purpose.includes("any"));
    const maskable = icons.some((i) => i.purpose?.includes("maskable"));
    expect(any).toBe(true);
    expect(maskable).toBe(true);
  });

  it("every manifest icon points to an existing file in public/", () => {
    for (const icon of m.icons ?? []) {
      const filePath = resolve(PUBLIC, "." + icon.src);
      expect(existsSync(filePath), `Missing icon: ${icon.src}`).toBe(true);
    }
  });
});

describe("PWA public assets", () => {
  it.each(REQUIRED_PUBLIC_FILES)("public/%s exists", (file) => {
    expect(existsSync(resolve(PUBLIC, file))).toBe(true);
  });
});

describe("Service worker source", () => {
  const sw = readFileSync(resolve(PUBLIC, "sw.js"), "utf8");

  it("bypasses /admin requests", () => {
    expect(sw).toMatch(/\/admin/);
    expect(sw).toMatch(/shouldBypass/);
  });

  it("bypasses /api requests", () => {
    expect(sw).toMatch(/\/api/);
  });

  it("bypasses RSC payloads", () => {
    expect(sw).toMatch(/_rsc/);
  });

  it("falls back to /offline.html on navigation failure", () => {
    expect(sw).toMatch(/offline\.html/);
  });

  it("uses a versioned cache name", () => {
    expect(sw).toMatch(/CACHE_VERSION\s*=\s*["'][^"']+["']/);
  });

  it("cleans old caches on activate", () => {
    expect(sw).toMatch(/caches\.delete/);
  });

  it("does not aggressively cache HTML for navigation requests", () => {
    // Navigation handler must NOT call cache.put on the response — that
    // is what creates the "stale product page" failure mode. We slice
    // the SW source from the first "navigate" match to the next "return"
    // and confirm no cache.put appears in that span.
    const navIdx = sw.indexOf('"navigate"');
    expect(navIdx).toBeGreaterThan(-1);
    const tail = sw.slice(navIdx);
    const returnIdx = tail.indexOf("return;");
    expect(returnIdx).toBeGreaterThan(-1);
    const navBlock = tail.slice(0, returnIdx);
    expect(navBlock).not.toMatch(/cache\.put/);
  });
});
