// Regression guard for the FeaturedCategories editorial CTA link
// painted by every category row. Phase B Slice 4 — terracotta-500
// contrast sweep — locked the hover/focus colour at terracotta-600
// (5.80:1 on bone-50, AA-clear); see docs/design/contrast.md.
//
// Earlier in this slice the test reached into the private
// CategoryRow function via `el.type.name === "CategoryRow"` and
// invoked it with its captured props to walk the rendered output.
// That worked, but coupled the test to an internal symbol name —
// any rename of CategoryRow would silently break the regression
// guard. The link className is the actual contract worth locking,
// so it now lives as the exported `CATEGORY_CTA_LINK_CLASS`
// constant. The test asserts the resolved CSS variable token
// directly on the constant — no rendering, no tree-walking, no
// internal-function reach.
//
// next-intl + the locale-aware Link export are mocked here only
// because the source module's transitive imports otherwise pull
// `next/navigation` into a vitest run that lacks Next's runtime
// shim; the mocks let the constant be imported in isolation.

import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "ka",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
}));

vi.mock("@/lib/data/categories", () => ({
  getCategories: async () => [],
}));

import { CATEGORY_CTA_LINK_CLASS } from "./FeaturedCategories";

describe("FeaturedCategories CATEGORY_CTA_LINK_CLASS", () => {
  it("paints hover/focus in terracotta-600, not terracotta-500", () => {
    expect(CATEGORY_CTA_LINK_CLASS).toContain(
      "hover:text-[var(--color-terracotta-600)]"
    );
    expect(CATEGORY_CTA_LINK_CLASS).toContain(
      "focus-visible:text-[var(--color-terracotta-600)]"
    );
    expect(CATEGORY_CTA_LINK_CLASS).not.toContain(
      "text-[var(--color-terracotta-500)]"
    );
  });

  it("rests at ink-900 (16.49:1 on bone-50, AAA-clear)", () => {
    expect(CATEGORY_CTA_LINK_CLASS).toContain("text-[var(--color-ink-900)]");
  });
});
