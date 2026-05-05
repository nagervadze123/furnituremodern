// Element-tree tests for the Phase 6 Slice 1 breadcrumbs visual port.
// Mocks the locale-aware Link export — the component otherwise needs
// a request scope to run. Tests run in node (no DOM); we walk the
// React element tree the same way the design primitive tests do.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

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

import { Breadcrumbs, type BreadcrumbCrumb } from "./breadcrumbs";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  "aria-label"?: string;
  "aria-current"?: string;
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

const TRAIL: BreadcrumbCrumb[] = [
  { label: "Home", href: "/" },
  { label: "Sofas", href: "/sofas" },
  { label: "Alazani 240" },
];

describe("Breadcrumbs", () => {
  it("renders a <nav> with aria-label='Breadcrumb'", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    expect(tree.type).toBe("nav");
    expect(tree.props["aria-label"]).toBe("Breadcrumb");
  });

  // Phase 6 Slice 1 — editorial typography (12 px, 0.14 em tracking,
  // uppercase, 500 weight). Lock the className so a future
  // regression that drops one of these doesn't slip through.
  it("paints editorial typography on the <nav>", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    const cn = tree.props.className ?? "";
    expect(cn).toMatch(/text-\[12px\]/);
    expect(cn).toMatch(/uppercase/);
    expect(cn).toMatch(/tracking-\[0\.14em\]/);
    expect(cn).toMatch(/font-medium/);
    expect(cn).toContain("text-[var(--color-ink-500)]");
  });

  it("marks the trailing crumb with aria-current='page' and ink-900", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    const currents = findAll(
      tree,
      (el) => el.props["aria-current"] === "page"
    );
    expect(currents).toHaveLength(1);
    expect(flatText(currents[0])).toBe("Alazani 240");
    expect(currents[0].props.className).toContain(
      "text-[var(--color-ink-900)]"
    );
  });

  it("renders linked crumbs for every non-trailing item with an href", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    // The mocked Link is a functional component, so the unrendered tree
    // carries an element with type=<mock fn> and props.href set. Filter
    // by href presence — only Link consumers pass href in this tree.
    const links = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return typeof props.href === "string";
    });
    expect(links).toHaveLength(2);
    expect(links[0].props.href).toBe("/");
    expect(links[1].props.href).toBe("/sofas");
    // Links inherit ink-500 from the nav and lift to ink-900 on hover.
    for (const link of links) {
      const cn = link.props.className ?? "";
      expect(cn).toContain("hover:text-[var(--color-ink-900)]");
    }
  });

  // Phase 6 visual port replaces the prior <ChevronRight> icon with a
  // text "/" separator painted ink-300. Lock both the glyph and the
  // colour so a future revert is caught.
  it("uses '/' text separators painted ink-300, aria-hidden", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    const seps = findAll(
      tree,
      (el) =>
        el.type === "span" &&
        flatText(el) === "/" &&
        // aria-hidden on the separator may be either "true" or boolean.
        (el.props["aria-hidden"] === "true" || el.props["aria-hidden"] === true)
    );
    expect(seps).toHaveLength(2);
    for (const sep of seps) {
      expect(sep.props.className).toContain("text-[var(--color-ink-300)]");
    }
  });

  // Phase 6 terracotta-500 use rule (`docs/design/contrast.md`) —
  // breadcrumbs render at 12 px / body size and must not paint
  // terracotta-500 anywhere. Walk every element and assert.
  it("never paints terracotta-500 anywhere on the trail", () => {
    const tree = Breadcrumbs({ items: TRAIL }) as AnyElement;
    const offenders = findAll(tree, (el) => {
      const cn = (el.props as { className?: string }).className ?? "";
      return cn.includes("terracotta-500");
    });
    expect(offenders).toHaveLength(0);
  });
});
