// Component-level tests for the motion primitives. We don't render
// to the DOM (the test runner is configured for `node` environment so
// no jsdom is in play); instead we walk the React element tree the
// same way lib/og/og.test.tsx does. That's enough to assert the
// component's shape, prop wiring, and reduced-motion behavior.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

// Mock the hooks so we don't need a browser environment. Both hooks
// run in "client" mode but we want deterministic returns for tests.
vi.mock("./hooks", () => ({
  useReducedMotion: vi.fn(() => false),
  useInViewOnce: vi.fn(() => ({ ref: { current: null }, inView: true })),
  useScrollProgress: vi.fn(() => ({ ref: { current: null }, progress: 0.5 })),
}));

import { Parallax, Reveal, RevealStagger } from "./components";
import * as hooks from "./hooks";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  style?: Record<string, unknown>;
  initial?: unknown;
  animate?: unknown;
  variants?: unknown;
}>;

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

describe("Reveal", () => {
  it("renders its children", () => {
    const tree = Reveal({ children: "hello world" }) as AnyElement;
    expect(flatText(tree)).toBe("hello world");
  });

  it("forwards className", () => {
    const tree = Reveal({
      children: "x",
      className: "test-class",
    }) as AnyElement;
    // className may be on inner motion element; flatten and search.
    const stringified = JSON.stringify(tree, (_, v) =>
      typeof v === "function" ? "[fn]" : v
    );
    expect(stringified).toContain("test-class");
  });

  it("renders children statically when prefers-reduced-motion is set", () => {
    vi.mocked(hooks.useReducedMotion).mockReturnValueOnce(true);
    const tree = Reveal({ children: "static" }) as AnyElement;
    expect(flatText(tree)).toBe("static");
    // No `initial` prop on the static fallback root.
    expect(tree.props.initial).toBeUndefined();
  });

  it("uses slideUp by default — element style includes a transform translateY", () => {
    const tree = Reveal({ children: "x" }) as AnyElement;
    const style = tree.props.style as Record<string, string>;
    // The mock returns inView=true, so the visible style applies.
    expect(style.transform).toContain("translateY(");
  });

  it("accepts a different variant and applies its visible style", () => {
    const fadeTree = Reveal({
      children: "x",
      variant: "fadeIn",
    }) as AnyElement;
    const style = fadeTree.props.style as Record<string, unknown>;
    expect(style.opacity).toBe(1);
    expect(style.transform).toBeUndefined();
  });

  it("transition rule names opacity, transform, and clip-path", () => {
    const tree = Reveal({ children: "x" }) as AnyElement;
    const transition = (tree.props.style as Record<string, string>).transition;
    expect(transition).toMatch(/opacity/);
    expect(transition).toMatch(/transform/);
    expect(transition).toMatch(/clip-path/);
  });
});

describe("RevealStagger", () => {
  it("renders its children", () => {
    const tree = RevealStagger({
      children: "items",
    }) as AnyElement;
    expect(flatText(tree)).toBe("items");
  });

  it("applies fm-stagger and fm-stagger-revealed classes when in view", () => {
    const tree = RevealStagger({
      children: "items",
      className: "extra",
    }) as AnyElement;
    expect(tree.props.className).toContain("fm-stagger");
    expect(tree.props.className).toContain("fm-stagger-revealed");
    expect(tree.props.className).toContain("extra");
  });

  it("renders statically under reduced-motion (no fm-stagger class)", () => {
    vi.mocked(hooks.useReducedMotion).mockReturnValueOnce(true);
    const tree = RevealStagger({
      children: "items",
      className: "list",
    }) as AnyElement;
    expect(flatText(tree)).toBe("items");
    expect(tree.props.className).toBe("list");
    expect(tree.props.style).toBeUndefined();
  });
});

describe("Parallax", () => {
  it("renders children", () => {
    const tree = Parallax({ children: "child" }) as AnyElement;
    expect(flatText(tree)).toBe("child");
  });

  it("caps maxOffset at 60 pixels", () => {
    // Ask for 200; the primitive should clamp to 60. progress=0.5 from
    // mock means offset = (0.5-0.5) * cap * 2 = 0 — clamping is hard
    // to observe at the centre. Re-mock progress to 1 → offset = cap.
    vi.mocked(hooks.useScrollProgress).mockReturnValueOnce({
      ref: { current: null },
      progress: 1,
    });
    const tree = Parallax({
      children: "child",
      maxOffset: 200,
    }) as AnyElement;
    const transform = (tree.props.style as Record<string, string>).transform;
    // (1 - 0.5) * 60 * 2 = 60.00
    expect(transform).toBe("translate3d(0, 60.00px, 0)");
  });

  it("renders statically under reduced motion (no transform)", () => {
    vi.mocked(hooks.useReducedMotion).mockReturnValueOnce(true);
    const tree = Parallax({ children: "x" }) as AnyElement;
    expect(tree.props.style).toBeUndefined();
  });
});
