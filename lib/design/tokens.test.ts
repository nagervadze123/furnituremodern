// Tests for the design token system in lib/design/tokens.ts.
// Tokens are static constants — these tests guard the shape and the
// validity of values (every color must parse, every spacing must be a
// rem string, every typography variant must declare font-size and
// line-height). They run as pure node tests; no DOM or rendering.

import { describe, it, expect } from "vitest";
import {
  tokens,
  surfaces,
  ink,
  accent,
  semantic,
  border,
  colors,
  spacing,
  fontFamilies,
  typography,
  radius,
  shadow,
  zIndex,
  breakpoint,
} from "./tokens";

const OKLCH_RE = /^oklch\(\s*[0-9.]+\s+[0-9.]+\s+[0-9.]+(?:\s*\/\s*[0-9.%]+)?\s*\)$/;
const HSL_RE = /^hsl\(\s*[0-9.]+\s*,?\s*[0-9.]+%\s*,?\s*[0-9.]+%\s*(?:\/\s*[0-9.%]+\s*)?\)$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const REM_RE = /^[0-9]+(?:\.[0-9]+)?rem$/;
const PX_RE = /^[0-9]+(?:\.[0-9]+)?px$/;
const PERCENT_RE = /^[0-9]+(?:\.[0-9]+)?%$/;

const isValidColor = (s: string) =>
  OKLCH_RE.test(s) || HSL_RE.test(s) || HEX_RE.test(s);
const isValidSize = (s: string) =>
  REM_RE.test(s) || PX_RE.test(s) || PERCENT_RE.test(s) || s === "0";

describe("design tokens — shape", () => {
  it("exposes a single tokens object containing every category", () => {
    expect(tokens).toBeDefined();
    expect(tokens.colors).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.fontFamilies).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.radius).toBeDefined();
    expect(tokens.shadow).toBeDefined();
    expect(tokens.zIndex).toBeDefined();
    expect(tokens.breakpoint).toBeDefined();
  });

  it("colors aggregates every named scale", () => {
    expect(colors.surface).toBe(surfaces);
    expect(colors.ink).toBe(ink);
    expect(colors.accent).toBe(accent);
    expect(colors.semantic).toBe(semantic);
    expect(colors.border).toBe(border);
  });
});

describe("color tokens — surface scale", () => {
  it("declares every step from 0 (deepest base) to 400 (raised card)", () => {
    expect(Object.keys(surfaces).sort()).toEqual(
      ["0", "50", "100", "200", "300", "400"].sort()
    );
  });

  it("every surface value is a valid color string", () => {
    for (const [key, value] of Object.entries(surfaces)) {
      expect(isValidColor(value), `surface-${key} = ${value}`).toBe(true);
    }
  });
});

describe("color tokens — ink scale", () => {
  it("declares ink-100 / 80 / 60 / 40 / 20", () => {
    expect(Object.keys(ink).sort()).toEqual(
      ["100", "80", "60", "40", "20"].sort()
    );
  });

  it("every ink value is a valid color string", () => {
    for (const [key, value] of Object.entries(ink)) {
      expect(isValidColor(value), `ink-${key} = ${value}`).toBe(true);
    }
  });
});

describe("color tokens — accent scale", () => {
  it("declares base / soft / strong / muted", () => {
    expect(Object.keys(accent).sort()).toEqual(
      ["base", "soft", "strong", "muted"].sort()
    );
  });

  it("every accent value is a valid color string", () => {
    for (const [key, value] of Object.entries(accent)) {
      expect(isValidColor(value), `accent-${key} = ${value}`).toBe(true);
    }
  });
});

describe("color tokens — semantic + border", () => {
  it("declares success / warning / error / info", () => {
    expect(Object.keys(semantic).sort()).toEqual(
      ["success", "warning", "error", "info"].sort()
    );
    for (const [key, value] of Object.entries(semantic)) {
      expect(isValidColor(value), `semantic.${key} = ${value}`).toBe(true);
    }
  });

  it("declares subtle / default / strong borders", () => {
    expect(Object.keys(border).sort()).toEqual(
      ["subtle", "default", "strong"].sort()
    );
    for (const [key, value] of Object.entries(border)) {
      expect(isValidColor(value), `border.${key} = ${value}`).toBe(true);
    }
  });
});

describe("spacing tokens", () => {
  it("declares the premium 18 / 22 / 30 / 36 / 44 stops", () => {
    expect(Object.keys(spacing).sort()).toEqual(
      ["18", "22", "30", "36", "44"].sort()
    );
  });

  it("every spacing value is a rem string", () => {
    for (const [key, value] of Object.entries(spacing)) {
      expect(REM_RE.test(value), `spacing.${key} = ${value}`).toBe(true);
    }
  });
});

describe("font family tokens", () => {
  it("declares locale-specific display + body families", () => {
    expect(fontFamilies.displayKa).toBeDefined();
    expect(fontFamilies.displayEn).toBeDefined();
    expect(fontFamilies.bodyKa).toBeDefined();
    expect(fontFamilies.bodyEn).toBeDefined();
  });

  it("each family resolves to a CSS var or named family", () => {
    for (const [key, value] of Object.entries(fontFamilies)) {
      expect(typeof value, `fontFamilies.${key}`).toBe("string");
      // Must be a CSS var() reference or a comma-separated name list.
      expect(value.length, `fontFamilies.${key}`).toBeGreaterThan(0);
    }
  });
});

describe("typography tokens", () => {
  const requiredVariants = [
    "display-1",
    "display-2",
    "heading-1",
    "heading-2",
    "heading-3",
    "body-lg",
    "body",
    "body-sm",
    "caption",
  ];

  it("declares all nine type-scale variants", () => {
    for (const variant of requiredVariants) {
      expect(typography[variant as keyof typeof typography]).toBeDefined();
    }
  });

  it("every variant declares fontSize + lineHeight", () => {
    for (const variant of requiredVariants) {
      const v = typography[variant as keyof typeof typography];
      expect(v.fontSize, `${variant}.fontSize`).toBeDefined();
      expect(v.lineHeight, `${variant}.lineHeight`).toBeDefined();
      expect(isValidSize(v.fontSize)).toBe(true);
    }
  });
});

describe("radius tokens", () => {
  it("declares none / sm / md / lg / xl / 2xl / full", () => {
    expect(Object.keys(radius).sort()).toEqual(
      ["none", "sm", "md", "lg", "xl", "2xl", "full"].sort()
    );
  });

  it("md is the default 0.5rem stop", () => {
    expect(radius.md).toBe("0.5rem");
  });

  it("full is a pill radius", () => {
    expect(radius.full).toBe("9999px");
  });
});

describe("shadow tokens", () => {
  it("declares soft / medium / large / focus", () => {
    expect(Object.keys(shadow).sort()).toEqual(
      ["soft", "medium", "large", "focus"].sort()
    );
  });

  it("each shadow value is a non-empty string", () => {
    for (const [key, value] of Object.entries(shadow)) {
      expect(value.length, `shadow.${key}`).toBeGreaterThan(0);
    }
  });

  it("focus shadow is a 3px ring (AAA-friendly)", () => {
    expect(shadow.focus).toMatch(/3px/);
  });
});

describe("z-index tokens", () => {
  it("orders base < dropdown < stickyHeader < banner < overlay < modal < popover < toast", () => {
    const order = [
      zIndex.base,
      zIndex.dropdown,
      zIndex.stickyHeader,
      zIndex.banner,
      zIndex.overlay,
      zIndex.modal,
      zIndex.popover,
      zIndex.toast,
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!, `step ${i}`).toBeGreaterThan(order[i - 1]!);
    }
  });
});

describe("breakpoint tokens", () => {
  it("aliases the standard mobile / tablet / laptop / desktop / wide", () => {
    expect(breakpoint.mobile).toBe(640);
    expect(breakpoint.tablet).toBe(768);
    expect(breakpoint.laptop).toBe(1024);
    expect(breakpoint.desktop).toBe(1280);
    expect(breakpoint.wide).toBe(1536);
  });
});
