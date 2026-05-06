// Element-tree tests for the Phase 6 Slice 5 home Hero. Focused
// on the two contracts most consequential to performance + the
// editorial port:
//
//   1. The LCP image keeps `priority`. Without this flag, Next
//      defers loading and the LCP regresses by ~400-800 ms in
//      practice. The slice's acceptance criterion is "≤ ±2 LCP
//      points on Lighthouse" — a missing priority alone would
//      blow that budget.
//   2. The headline uses `<EditorialHeading variant="hero">`.
//      `variant="hero"` resolves to the `.display-hero` CSS
//      class introduced in this slice; falling back to `variant={1}`
//      would render at `.display-1` size, breaking the visual
//      hierarchy with the other display-step headings on the page.
//
// Vitest runs in node — we walk the unrendered React element tree
// rather than rendering through React. The Hero references private
// helpers and a server-only data layer; we mock the i18n surface
// (including `t.rich` for the em-accented headline) and the Link
// export to keep the import graph pure.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    const t = (key: string) => `${namespace ?? "fallback"}.${key}`;
    (t as unknown as { rich: (key: string) => string }).rich = (
      key: string
    ) => `${namespace ?? "fallback"}.${key}`;
    return t;
  },
  getLocale: async () => "ka",
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

import { Hero } from "./Hero";
import { EditorialHeading } from "@/components/design";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  priority?: boolean;
  variant?: unknown;
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

describe("Hero", () => {
  it("renders an EditorialHeading with the 'hero' variant for the LCP heading", async () => {
    const tree = (await Hero()) as AnyElement;
    const headings = findAll(tree, (el) => el.type === EditorialHeading);
    expect(headings).toHaveLength(1);
    const props = headings[0]!.props as Record<string, unknown>;
    expect(props.variant).toBe("hero");
  });

  // The LCP image must carry priority. AspectImage forwards every
  // unknown prop onto the inner next/image — finding any element
  // in the tree with `priority === true` is enough to lock the
  // contract. (We don't need to walk into AspectImage's render
  // body; AspectImage is a function reference and its props carry
  // everything we passed.)
  it("passes priority through to the LCP image element", async () => {
    const tree = (await Hero()) as AnyElement;
    const priorityElements = findAll(tree, (el) => {
      const props = el.props as Record<string, unknown>;
      return props.priority === true;
    });
    expect(priorityElements.length).toBeGreaterThanOrEqual(1);
  });

  // Phase 6 terracotta-500 use rule — no terracotta-500 paint on
  // text anywhere in the hero. The primary CTA paints a
  // terracotta-500 background fill (filled-button surface,
  // permitted under SC 1.4.11), but no element should carry
  // `text-[var(--color-terracotta-500)]` on the homepage hero
  // surface. precommit invariant 6 enforces this repo-wide; this
  // test makes the hero contract explicit.
  it("never paints terracotta-500 on text anywhere in the hero", async () => {
    const tree = (await Hero()) as AnyElement;
    const offenders = findAll(tree, (el) => {
      const cn = ((el.props as Record<string, unknown>).className ??
        "") as string;
      return cn.includes("text-[var(--color-terracotta-500)]");
    });
    expect(offenders).toHaveLength(0);
  });
});
