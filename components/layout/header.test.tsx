// Element-tree test for the redesigned Header. Confirms the
// scroll-aware skeleton renders correctly without going to the DOM.
//
// Vitest runs in node mode and we never render through React, so the
// `type` of a sub-component element is the real (or mocked) function
// reference — its body is not executed. We search for sub-components
// by reference equality (e.g. `el.type === LanguageSwitcher`) rather
// than peeking inside their rendered output.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    return (key: string) => `${namespace ?? "fallback"}.${key}`;
  },
  getLocale: async () => "ka",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children?: unknown;
    className?: string;
    "aria-label"?: string;
  }) => ({
    type: "a",
    props: { href, className, "aria-label": ariaLabel, children },
    key: null,
  }),
}));

vi.mock("@/lib/data/categories", () => ({
  getFeaturedNavCategories: async () => [
    {
      slug: "sofas",
      name: { ka: "დივნები", en: "Sofas" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x", en: "x" },
      sortOrder: 0,
      isFeaturedInNav: true,
    },
  ],
}));

import { Header } from "./header";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandMark } from "./BrandMark";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { HeaderScrollEffect } from "./HeaderScrollEffect";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  "data-site-header"?: boolean | string;
  "data-scrolled"?: string;
}> & { type: unknown };

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

describe("Header", () => {
  it("renders a <header> with data-site-header attribute and initial data-scrolled=false", async () => {
    const tree = (await Header()) as AnyElement;
    const header = findAll(tree, (el) => el.type === "header")[0];
    expect(header).toBeTruthy();
    const props = header!.props as Record<string, unknown>;
    expect(props["data-site-header"]).toBeTruthy();
    expect(props["data-scrolled"]).toBe("false");
  });

  it("renders the skip-link as the first child of the fragment", async () => {
    const tree = (await Header()) as AnyElement;
    const children = (tree.props as Record<string, unknown>).children as
      | unknown[]
      | unknown;
    const arr = Array.isArray(children) ? children : [children];
    const first = arr.find(
      (n): n is AnyElement =>
        typeof n === "object" && n !== null && "type" in (n as AnyElement)
    );
    expect(first?.type).toBe("a");
    expect((first?.props as Record<string, unknown>).href).toBe(
      "#main-content"
    );
  });

  it("renders the BrandMark, DesktopNav, LanguageSwitcher, and MobileNav child components", async () => {
    const tree = (await Header()) as AnyElement;
    expect(findAll(tree, (el) => el.type === BrandMark).length).toBe(1);
    expect(findAll(tree, (el) => el.type === DesktopNav).length).toBe(1);
    expect(findAll(tree, (el) => el.type === LanguageSwitcher).length).toBe(1);
    expect(findAll(tree, (el) => el.type === MobileNav).length).toBe(1);
  });

  it("mounts the HeaderScrollEffect island", async () => {
    const tree = (await Header()) as AnyElement;
    expect(findAll(tree, (el) => el.type === HeaderScrollEffect).length).toBe(
      1
    );
  });

  it("passes Home + every featured category as items to DesktopNav", async () => {
    const tree = (await Header()) as AnyElement;
    const desktop = findAll(tree, (el) => el.type === DesktopNav)[0];
    expect(desktop).toBeTruthy();
    const items = (desktop!.props as Record<string, unknown>).items as Array<{
      label: string;
      href: string;
    }>;
    expect(items[0]!.href).toBe("/");
    expect(items.some((i) => i.href === "/sofas")).toBe(true);
  });
});
