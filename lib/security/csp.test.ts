import { describe, it, expect } from "vitest";
import { buildCsp } from "./csp";
import { readAnalyticsConfig } from "@/lib/analytics/config";

const NONCE = "TESTNONCETESTNONCETEST==";
const SUPABASE = "https://example.supabase.co";

function prodCsp(args: Partial<Parameters<typeof buildCsp>[0]> = {}) {
  return buildCsp({
    nonce: NONCE,
    isDev: false,
    supabaseOrigin: SUPABASE,
    ...args,
  });
}

function devCsp(args: Partial<Parameters<typeof buildCsp>[0]> = {}) {
  return buildCsp({
    nonce: NONCE,
    isDev: true,
    supabaseOrigin: SUPABASE,
    ...args,
  });
}

// Pull a single directive's body out of the joined CSP string. Throws if
// the directive is missing — the assertion in the calling test gives a
// clearer failure than a TypeError.
function getDirective(csp: string, name: string): string {
  const part = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${name} `) || s === name);
  if (!part) throw new Error(`CSP directive ${name} not present: ${csp}`);
  return part.slice(name.length).trim();
}

describe("buildCsp — production strictness", () => {
  it("includes the nonce and 'strict-dynamic' on script-src", () => {
    const script = getDirective(prodCsp(), "script-src");
    expect(script).toContain(`'nonce-${NONCE}'`);
    expect(script).toContain("'strict-dynamic'");
    expect(script).toContain("'self'");
  });

  it("never lets 'unsafe-eval' into production script-src", () => {
    const script = getDirective(prodCsp(), "script-src");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("never lets 'unsafe-inline' into production script-src", () => {
    const script = getDirective(prodCsp(), "script-src");
    expect(script).not.toContain("'unsafe-inline'");
  });

  it("emits script-src-elem with the same trust set as script-src", () => {
    const csp = prodCsp();
    expect(getDirective(csp, "script-src-elem")).toBe(
      getDirective(csp, "script-src")
    );
  });

  it("includes upgrade-insecure-requests", () => {
    expect(prodCsp().split(";").map((s) => s.trim())).toContain(
      "upgrade-insecure-requests"
    );
  });

  it("declares frame-ancestors 'none'", () => {
    expect(getDirective(prodCsp(), "frame-ancestors")).toBe("'none'");
  });

  it("declares form-action 'self'", () => {
    expect(getDirective(prodCsp(), "form-action")).toBe("'self'");
  });

  it("declares object-src 'none'", () => {
    expect(getDirective(prodCsp(), "object-src")).toBe("'none'");
  });

  it("declares base-uri 'self'", () => {
    expect(getDirective(prodCsp(), "base-uri")).toBe("'self'");
  });

  it("includes the Supabase origin and its wss peer in connect-src", () => {
    const connect = getDirective(prodCsp(), "connect-src");
    expect(connect).toContain(SUPABASE);
    expect(connect).toContain(SUPABASE.replace(/^https:/, "wss:"));
    expect(connect).toContain("'self'");
  });

  it("lists the Supabase origin explicitly in img-src", () => {
    expect(getDirective(prodCsp(), "img-src")).toContain(SUPABASE);
  });

  it("allows fonts.gstatic.com in font-src", () => {
    expect(getDirective(prodCsp(), "font-src")).toContain(
      "https://fonts.gstatic.com"
    );
  });
});

describe("buildCsp — development relaxation", () => {
  it("includes 'unsafe-eval' in script-src in dev", () => {
    expect(getDirective(devCsp(), "script-src")).toContain("'unsafe-eval'");
  });

  it("still keeps the nonce and strict-dynamic in dev", () => {
    const script = getDirective(devCsp(), "script-src");
    expect(script).toContain(`'nonce-${NONCE}'`);
    expect(script).toContain("'strict-dynamic'");
  });
});

describe("buildCsp — analytics provider domains", () => {
  it("omits all provider hosts when no analytics env var is set", () => {
    const analytics = readAnalyticsConfig({});
    const csp = prodCsp({ analytics });
    expect(csp).not.toContain("www.googletagmanager.com");
    expect(csp).not.toContain("connect.facebook.net");
    expect(csp).not.toContain("plausible.io");
  });

  it("adds the Google bundle when NEXT_PUBLIC_GA4_MEASUREMENT_ID is set", () => {
    const analytics = readAnalyticsConfig({
      NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-ABC",
    });
    const csp = prodCsp({ analytics });
    expect(getDirective(csp, "script-src")).toContain(
      "https://www.googletagmanager.com"
    );
    expect(getDirective(csp, "connect-src")).toContain(
      "https://www.google-analytics.com"
    );
  });

  it("adds the GTM host when NEXT_PUBLIC_GTM_ID is set", () => {
    const analytics = readAnalyticsConfig({
      NEXT_PUBLIC_GTM_ID: "GTM-XYZ",
    });
    const csp = prodCsp({ analytics });
    expect(getDirective(csp, "script-src")).toContain(
      "https://www.googletagmanager.com"
    );
  });

  it("adds the Meta hosts when only NEXT_PUBLIC_META_PIXEL_ID is set", () => {
    const analytics = readAnalyticsConfig({
      NEXT_PUBLIC_META_PIXEL_ID: "12345",
    });
    const csp = prodCsp({ analytics });
    expect(getDirective(csp, "script-src")).toContain(
      "https://connect.facebook.net"
    );
    expect(getDirective(csp, "connect-src")).toContain(
      "https://www.facebook.com"
    );
  });

  it("adds the Plausible host when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set", () => {
    const analytics = readAnalyticsConfig({
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "example.com",
    });
    const csp = prodCsp({ analytics });
    expect(getDirective(csp, "script-src")).toContain("https://plausible.io");
    expect(getDirective(csp, "connect-src")).toContain("https://plausible.io");
  });

  it("strips Meta + GA4 direct hosts when GTM is set (GTM owns those tags)", () => {
    const analytics = readAnalyticsConfig({
      NEXT_PUBLIC_GTM_ID: "GTM-XYZ",
      NEXT_PUBLIC_META_PIXEL_ID: "12345",
    });
    const csp = prodCsp({ analytics });
    // Google host stays — GTM uses it.
    expect(getDirective(csp, "script-src")).toContain(
      "https://www.googletagmanager.com"
    );
    // Meta direct host drops out — fix by clearing NEXT_PUBLIC_GTM_ID
    // if a Meta-via-GTM container is in use (documented in csp.ts).
    expect(csp).not.toContain("https://connect.facebook.net");
  });
});
