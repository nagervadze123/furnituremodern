// Element-tree tests for LanguageSwitcher. Vitest runs in node mode
// (no DOM), so we mock the next-intl hooks + Link and walk the React
// tree the function returns.
//
// Coverage:
//   • Both locales render.
//   • The active locale is marked aria-current and rendered as a span
//     (not a Link) by default — matches the spec ("collapseActive=true
//     by default").
//   • Each non-active locale renders a Link pointing at the same
//     pathname under the alternate locale prop — that's how the
//     switcher preserves the current page on swap.
//   • collapseActive=false still renders a Link for the active locale
//     so callers that want the duplicate Link semantics can opt in.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

// useTranslations is identity-mocked so the keys themselves come back
// as the visible strings — that lets us assert on key names without
// loading the messages bundle.
vi.mock("next-intl", () => ({
  useLocale: () => "ka",
  useTranslations: () => (key: string) => key,
}));

// vitest in node mode never executes the mock body — the JSX tree
// walker reads the original element's props (including `locale`)
// directly, so we don't need to transform anything in the mock.
vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  usePathname: () => "/sofas/walnut-loveseat",
}));

import { LanguageSwitcher } from "./LanguageSwitcher";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  locale?: string;
  "aria-current"?: string;
  "aria-label"?: string;
}> & { type: unknown };

function flatText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatText).join("");
  if (typeof node === "object" && "props" in (node as AnyElement)) {
    return flatText((node as AnyElement).props?.children);
  }
  return "";
}

function findAll(
  node: unknown,
  predicate: (el: AnyElement) => boolean,
  out: AnyElement[] = []
): AnyElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  const el = node as AnyElement;
  if (predicate(el)) out.push(el);
  findAll((el.props as Record<string, unknown>)?.children, predicate, out);
  return out;
}

describe("LanguageSwitcher", () => {
  it("renders both locale codes (KA and EN)", () => {
    const tree = LanguageSwitcher({}) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain("KA");
    expect(text).toContain("EN");
  });

  it("marks the active locale (ka) with aria-current=true", () => {
    const tree = LanguageSwitcher({}) as AnyElement;
    const active = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return props["aria-current"] === "true";
    });
    // Exactly one element should claim aria-current.
    expect(active.length).toBe(1);
    expect(flatText(active[0])).toBe("KA");
  });

  it("renders the active locale as a span by default (collapseActive=true)", () => {
    const tree = LanguageSwitcher({}) as AnyElement;
    const active = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return props["aria-current"] === "true";
    });
    expect(active[0]?.type).toBe("span");
  });

  it("renders the inactive locale as a Link with the alternate locale prop", () => {
    const tree = LanguageSwitcher({}) as AnyElement;
    const links = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.locale === "string";
    });
    expect(links.length).toBe(1);
    expect(links[0]?.props.locale).toBe("en");
    // The href is the current pathname so the user keeps their place.
    expect(links[0]?.props.href).toBe("/sofas/walnut-loveseat");
  });

  it("emits an aria-label on the inactive Link describing the swap target", () => {
    const tree = LanguageSwitcher({}) as AnyElement;
    const links = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.locale === "string";
    });
    // The mocked useTranslations is identity — it returns the key.
    // Inactive locale is "en", so the aria-label should be the
    // "switchToEnglish" key.
    expect(links[0]?.props["aria-label"]).toBe("switchToEnglish");
  });

  it("renders the active locale as a Link when collapseActive=false", () => {
    const tree = LanguageSwitcher({
      collapseActive: false,
    }) as AnyElement;
    const links = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.locale === "string";
    });
    // Two links — one per locale.
    expect(links.length).toBe(2);
    const localeProps = links.map((l) => l.props.locale);
    expect(localeProps).toContain("ka");
    expect(localeProps).toContain("en");
  });

  it("drawer variant renders the full locale names", () => {
    const tree = LanguageSwitcher({
      variant: "drawer",
    }) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain("ქართული");
    expect(text).toContain("English");
  });
});
