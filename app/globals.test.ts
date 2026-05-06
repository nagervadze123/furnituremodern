// CSS-contract regression guards for class primitives in
// app/globals.css. Phase B Slice 4 — terracotta-500 contrast sweep —
// fixed `.text-link:hover` from terracotta-500 to ink-900. The class
// has zero production consumers today but exists as a Phase A
// editorial primitive for Slices 5 / 6 to consume; without a guard
// at the class level itself, any future re-introduction of
// terracotta-500 would only surface once a downstream consumer
// landed. This test reads `globals.css` directly and asserts the
// `.text-link:hover` block paints AA-clear colours regardless of
// who consumes the class.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

const globalsCss = readFileSync(
  join(process.cwd(), "app/globals.css"),
  "utf8"
);

// Extract the contents of a single CSS rule by selector. Returns
// only the block between the matching `{` and the next `}`. The
// matcher is anchored on a line-start `<selector> {` to avoid
// matching declarations that mention the selector inside a comment
// or selector list.
function ruleBody(css: string, selector: string): string {
  const index = css.indexOf(`\n${selector} {`);
  if (index === -1) {
    throw new Error(`selector ${selector} not found in CSS`);
  }
  const open = css.indexOf("{", index);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

describe(".text-link:hover", () => {
  it("does not paint terracotta-500 (the colour fails AA on bone-50 at body size)", () => {
    const body = ruleBody(globalsCss, ".text-link:hover");
    expect(body).not.toContain("var(--color-terracotta-500)");
  });

  it("paints ink-900 for both color and border-bottom-color (16.49:1 on bone-50)", () => {
    const body = ruleBody(globalsCss, ".text-link:hover");
    // Two declarations sit inside the block: `color` and
    // `border-bottom-color`. Both must resolve to ink-900 so any
    // future consumer that lives on a bone-* surface paints
    // AAA-clear without a per-consumer override.
    expect(body).toMatch(/color:\s*var\(--color-ink-900\);/);
    expect(body).toMatch(
      /border-bottom-color:\s*var\(--color-ink-900\);/
    );
  });
});

describe(".text-link", () => {
  // The resting state has always been ink-900; the Slice 4 sweep
  // changed the hover state to match. Lock the resting colour so
  // a future "let's repaint .text-link in some accent" change has
  // to update both this test and the docs together.
  it("rests at ink-900", () => {
    const body = ruleBody(globalsCss, ".text-link");
    expect(body).toMatch(/color:\s*var\(--color-ink-900\);/);
  });
});
