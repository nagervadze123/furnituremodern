// Element-tree tests for the Phase 6 Slice 2 IssueRibbon. Mocks
// next-intl/server (getTranslations) and the locale-aware Link export
// — the component is async and otherwise needs a request scope.

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

import { IssueRibbon } from "./IssueRibbon";
import { SectionMarker } from "@/components/design";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  "aria-label"?: string;
  "aria-hidden"?: string | boolean;
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
  predicate: (el: AnyElement) => boolean
): AnyElement[] {
  const out: AnyElement[] = [];
  function walk(n: unknown): void {
    if (n == null) return;
    if (Array.isArray(n)) {
      for (const child of n) walk(child);
      return;
    }
    if (typeof n !== "object") return;
    const el = n as AnyElement;
    if (predicate(el)) out.push(el);
    walk((el.props as Record<string, unknown>)?.children);
  }
  walk(node);
  return out;
}

describe("IssueRibbon", () => {
  it("renders a <nav> with aria-label='Section navigation'", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    expect(tree.type).toBe("nav");
    expect(tree.props["aria-label"]).toBe("Section navigation");
  });

  // Five numerated section anchors. The mocked Link sets `href`, so
  // walk the tree for every link and collect.
  it("renders five section links with the correct anchor hrefs", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    const links = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.href === "string";
    });
    expect(links).toHaveLength(5);
    const hrefs = links.map((l) => l.props.href);
    expect(hrefs).toEqual([
      "/#categories",
      "/#featured",
      "/#signature",
      "/#workshop",
      "/#visit",
    ]);
  });

  it("renders a SectionMarker per link with the right numeral + label", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    // Walk for unrendered SectionMarker elements (their function
    // type stays in the tree because we don't React-render). The
    // mocked translator returns `home.issue_ribbon.{key}` for every
    // key — we assert numeral + label props directly.
    const markers = findAll(tree, (el) => el.type === SectionMarker);
    expect(markers).toHaveLength(5);
    const expectedNumerals = ["I", "II", "III", "IV", "V"];
    const expectedKeys = [
      "section_1",
      "section_2",
      "section_3",
      "section_4",
      "section_5",
    ];
    markers.forEach((marker, i) => {
      const props = marker.props as Record<string, unknown>;
      expect(props.numeral).toBe(expectedNumerals[i]);
      expect(props.label).toBe(`home.issue_ribbon.${expectedKeys[i]}`);
    });
  });

  it("renders the 'In this issue —' label and the issue number", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain("home.issue_ribbon.in_this_issue");
    expect(text).toContain("home.issue_ribbon.issue");
  });

  // The middle-dot separators are decorative and must not be
  // announced by assistive tech.
  it("middle-dot separators are aria-hidden", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    const dots = findAll(
      tree,
      (el) =>
        el.type === "span" &&
        flatText(el) === "·" &&
        (el.props["aria-hidden"] === "true" || el.props["aria-hidden"] === true)
    );
    // 5 sections → 4 separators between them.
    expect(dots).toHaveLength(4);
  });

  // Phase 6 terracotta-500 use rule — body-size text on this surface.
  it("never paints terracotta-500 anywhere on the ribbon", async () => {
    const tree = (await IssueRibbon()) as AnyElement;
    const offenders = findAll(tree, (el) => {
      const cn = (el.props as { className?: string }).className ?? "";
      return cn.includes("terracotta-500");
    });
    expect(offenders).toHaveLength(0);
  });
});
