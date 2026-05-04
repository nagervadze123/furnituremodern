// Tests for the NavLink active-state matcher. We mock usePathname and
// the locale-aware Link, then assert that the element renders the
// correct activeClassName / aria-current value for each combination of
// pathname + href.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

const pathnameMock = vi.fn<() => string>();

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    className,
    children,
    "aria-current": ariaCurrent,
    "data-active": dataActive,
  }: {
    href: string;
    className?: string;
    children?: unknown;
    "aria-current"?: string;
    "data-active"?: string;
  }) => ({
    type: "a",
    props: {
      href,
      className,
      "aria-current": ariaCurrent,
      "data-active": dataActive,
      children,
    },
    key: null,
  }),
  usePathname: () => pathnameMock(),
}));

import { NavLink } from "./NavLink";

type AnyElement = ReactElement<{
  href?: string;
  className?: string;
  "aria-current"?: string;
  "data-active"?: string;
}> & { type: unknown };

describe("NavLink", () => {
  it("marks itself active on an exact match", () => {
    pathnameMock.mockReturnValue("/sofas");
    const tree = NavLink({
      href: "/sofas",
      children: "Sofas",
      className: "base",
      activeClassName: "active",
    }) as AnyElement;
    expect(tree.props["aria-current"]).toBe("page");
    expect(tree.props["data-active"]).toBe("true");
    expect(tree.props.className).toContain("active");
  });

  it("marks itself active on a prefix match (product detail under /sofas/...)", () => {
    pathnameMock.mockReturnValue("/sofas/walnut-loveseat");
    const tree = NavLink({
      href: "/sofas",
      children: "Sofas",
      className: "base",
      activeClassName: "active",
    }) as AnyElement;
    expect(tree.props["aria-current"]).toBe("page");
    expect(tree.props.className).toContain("active");
  });

  it("does not match a sibling category when the prefix is longer", () => {
    pathnameMock.mockReturnValue("/bedrooms/some-bed");
    const tree = NavLink({
      href: "/sofas",
      children: "Sofas",
      className: "base",
      activeClassName: "active",
    }) as AnyElement;
    expect(tree.props["aria-current"]).toBeUndefined();
    expect(tree.props.className).not.toContain("active");
  });

  it("treats the home href ('/') as exact-only by default when caller passes exact=true", () => {
    pathnameMock.mockReturnValue("/sofas");
    const tree = NavLink({
      href: "/",
      exact: true,
      children: "Home",
      className: "base",
      activeClassName: "active",
    }) as AnyElement;
    expect(tree.props["aria-current"]).toBeUndefined();
  });

  it("home href ('/') matches '/' even in non-exact mode (falls back to exact-style)", () => {
    pathnameMock.mockReturnValue("/");
    const tree = NavLink({
      href: "/",
      children: "Home",
      className: "base",
      activeClassName: "active",
    }) as AnyElement;
    expect(tree.props["aria-current"]).toBe("page");
  });
});
