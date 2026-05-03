import { describe, it, expect } from "vitest";
import {
  buildCsp,
  CSP_REPORT_PATH,
  CSP_REPORT_TO_NAME,
} from "./csp";
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

function reportOnlyCsp(
  args: Partial<Parameters<typeof buildCsp>[0]> = {}
) {
  return buildCsp({
    nonce: NONCE,
    isDev: false,
    supabaseOrigin: SUPABASE,
    mode: "report-only",
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

describe("buildCsp — Sentry ingest origin", () => {
  it("omits the Sentry ingest origin when sentryIngestOrigin is empty", () => {
    const connect = getDirective(prodCsp(), "connect-src");
    expect(connect).not.toContain("ingest.sentry.io");
    expect(connect).not.toContain("ingest.us.sentry.io");
  });

  it("adds only the Sentry ingest origin to connect-src (never script-src)", () => {
    const csp = prodCsp({
      sentryIngestOrigin: "https://o12345.ingest.us.sentry.io",
    });
    expect(getDirective(csp, "connect-src")).toContain(
      "https://o12345.ingest.us.sentry.io"
    );
    // Sentry must not appear in script-src — bundled SDK uses the
    // existing nonce/strict-dynamic path; script-src must not be
    // weakened to allow direct loading from sentry.io.
    expect(getDirective(csp, "script-src")).not.toContain("sentry.io");
    expect(getDirective(csp, "script-src-elem")).not.toContain("sentry.io");
  });
});

describe("buildCsp — violation reporting", () => {
  it("emits report-uri pointing at /api/csp-report", () => {
    expect(getDirective(prodCsp(), "report-uri")).toBe(CSP_REPORT_PATH);
  });

  it("emits report-to with the Reporting-Endpoints name", () => {
    expect(getDirective(prodCsp(), "report-to")).toBe(CSP_REPORT_TO_NAME);
  });

  it("CSP_REPORT_PATH is /api/csp-report (route handler stays in sync)", () => {
    expect(CSP_REPORT_PATH).toBe("/api/csp-report");
  });

  it("CSP_REPORT_TO_NAME matches the Reporting-Endpoints declaration", () => {
    // proxy.ts sets `Reporting-Endpoints: ${CSP_REPORT_TO_NAME}=…`,
    // so the constant has to be a single token (no spaces, no quotes).
    expect(CSP_REPORT_TO_NAME).toMatch(/^[a-z0-9-]+$/i);
  });

  it("emits both report directives in dev mode too", () => {
    // Dev keeps the directives so a developer testing locally can hit
    // /api/csp-report and verify wiring before deploy.
    expect(getDirective(devCsp(), "report-uri")).toBe(CSP_REPORT_PATH);
    expect(getDirective(devCsp(), "report-to")).toBe(CSP_REPORT_TO_NAME);
  });
});

describe("buildCsp — report-only mode (Phase 4 strict style-src)", () => {
  it("style-src is nonce-only with no 'unsafe-inline'", () => {
    const style = getDirective(reportOnlyCsp(), "style-src");
    expect(style).toContain(`'nonce-${NONCE}'`);
    expect(style).toContain("'self'");
    expect(style).not.toContain("'unsafe-inline'");
  });

  it("enforce mode keeps 'unsafe-inline' for base-ui compatibility", () => {
    // Documents the deliberate trade-off: strict style-src would
    // break base-ui's positioner-driven primitives that set inline
    // style attributes via floating-ui. The Report-Only header
    // surfaces those violations without blocking.
    expect(getDirective(prodCsp(), "style-src")).toContain("'unsafe-inline'");
  });

  it("preserves report-uri / report-to under report-only", () => {
    const csp = reportOnlyCsp();
    expect(getDirective(csp, "report-uri")).toBe(CSP_REPORT_PATH);
    expect(getDirective(csp, "report-to")).toBe(CSP_REPORT_TO_NAME);
  });

  it("report-only script-src remains as strict as enforce", () => {
    // The Report-Only header tightens style-src; everything else
    // stays as strict as production. A regression that loosens
    // script-src under report-only would silently erode the policy.
    const reportOnly = getDirective(reportOnlyCsp(), "script-src");
    const enforce = getDirective(prodCsp(), "script-src");
    expect(reportOnly).toBe(enforce);
  });
});
