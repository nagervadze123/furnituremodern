// Element-tree tests for the Phase 5b EyebrowNav magazine-masthead
// strip. Mocks next-intl/server (getTranslations) and the locale-aware
// Link export — the component otherwise needs a request scope to run.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    return (key: string) => `${namespace ?? "fallback"}.${key}`;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: unknown;
    className?: string;
  }) => ({
    type: "a",
    props: { href, className, children },
    key: null,
  }),
}));

import { EyebrowNav } from "./EyebrowNav";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
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

describe("EyebrowNav", () => {
  it("renders inside a <nav> with the section navigation aria-label", async () => {
    const tree = (await EyebrowNav()) as AnyElement;
    expect(tree.type).toBe("nav");
    expect(tree.props["aria-label"]).toBe("Section navigation");
  });

  it("renders three navigation links: Collection, Workshop, Contact", async () => {
    const tree = (await EyebrowNav()) as AnyElement;
    // The Collection link is rendered through the locale-aware <Link>
    // mock (type = function); Workshop / Contact are plain <a> anchors
    // (type = "a"). Both kinds carry an `href` string in props, so we
    // match on that to keep the predicate uniform.
    const anchors = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.href === "string";
    });
    expect(anchors.length).toBeGreaterThanOrEqual(3);

    const hrefs = anchors.map((a) => (a.props as { href?: string }).href);
    expect(hrefs).toContain("/sofas"); // Collection link
    expect(hrefs).toContain("#workshop"); // Workshop anchor
    expect(hrefs).toContain("#visit"); // Contact anchor
  });

  it("includes the i18n keys for all three labels", async () => {
    const tree = (await EyebrowNav()) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain("home.eyebrow_nav.collection");
    expect(text).toContain("home.eyebrow_nav.workshop");
    expect(text).toContain("home.eyebrow_nav.contact");
  });
});
