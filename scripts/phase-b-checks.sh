#!/usr/bin/env bash
# Phase B precommit invariants. Run before every commit; zero
# matches required across all five checks.
#
# Usage:
#   bash scripts/phase-b-checks.sh
#
# Exit codes:
#   0  all checks clean
#   1  at least one check found a violation
#
# Each check is documented in
# docs/design/archive/phase-b.md (decision log) and the canonical
# enforcement notes for individual rules live in
# docs/design/contrast.md.
#
# Phase B closed at Slice 8. Check #6 (the terracotta-500 paint
# baseline) was retired with the close of the port — its job was
# to gate creep across 7 slices of editorial churn, and going
# forward the canonical guard for terracotta-500 is the
# Permitted/Forbidden lists in docs/design/contrast.md (see the
# "Post-Phase-B enforcement" subsection there). The remaining
# five checks survive long-term: each encodes an invariant that
# is true regardless of whether the editorial port is live.

set -u

ok=1
fail() {
  ok=0
  printf '\033[31mFAIL\033[0m %s\n' "$1"
}
pass() {
  printf '\033[32mPASS\033[0m %s\n' "$1"
}

# 1. No Google Fonts @import in CSS or <link> in HTML/JSX.
#    The strict CSP forbids runtime fetches to fonts.googleapis.com;
#    self-hosted next/font is the only allowed source.
#    Scoped to source-code file extensions so docs/audit-trail prose
#    that quotes the forbidden snippet doesn't trip the check.
hits=$(git grep -nIE "@import\s+url\([^)]*googleapis|<link[^>]*googleapis" -- ':!*_design-reference*' '*.css' '*.scss' '*.html' '*.tsx' '*.jsx' '*.ts' '*.js' '*.mjs' 2>/dev/null)
if [ -n "$hits" ]; then
  fail "googleapis @import / <link>"
  printf '%s\n' "$hits"
else
  pass "googleapis @import / <link>"
fi

# 2. No data-screen-label attributes outside the staged reference.
#    data-screen-label is a claude.ai/design canvas annotation; it
#    must not leak into production markup. Scoped to markup file
#    extensions so docs/scripts that quote the term as prose don't
#    trip the check.
hits=$(git grep -nI "data-screen-label" -- ':!*_design-reference*' '*.tsx' '*.jsx' '*.ts' '*.js' '*.html' '*.css' 2>/dev/null)
if [ -n "$hits" ]; then
  fail "data-screen-label outside _design-reference/"
  printf '%s\n' "$hits"
else
  pass "data-screen-label outside _design-reference/"
fi

# 3. No imports from _design-reference/. The folder is a visual
#    reference only; importing from it would pull hardcoded Georgian
#    strings, plain <img> placeholders, and inline event handlers
#    into the production graph.
hits=$(git grep -nIE "from\s+['\"][^'\"]*_design-reference|import\s+['\"][^'\"]*_design-reference" -- ':!*_design-reference*' '*.tsx' '*.jsx' '*.ts' '*.js' '*.mjs' 2>/dev/null)
if [ -n "$hits" ]; then
  fail "imports from _design-reference/"
  printf '%s\n' "$hits"
else
  pass "imports from _design-reference/"
fi

# 4. No inline onMouseEnter / onMouseLeave handlers. Hover styling
#    must come from CSS :hover so it survives SSR + the strict CSP
#    and so reduced-motion / pointer-coarse media queries can scope
#    it. Inline handlers in the ZIP mocks (which mutate currentTarget
#    style) are exactly what we don't want copied across.
hits=$(git grep -nIE "onMouseEnter|onMouseLeave" -- ':!*_design-reference*' '*.tsx' '*.jsx' 2>/dev/null)
if [ -n "$hits" ]; then
  fail "inline onMouseEnter / onMouseLeave"
  printf '%s\n' "$hits"
else
  pass "inline onMouseEnter / onMouseLeave"
fi

# 5. No PascalCase *Button.tsx files. All button styling lives in
#    components/ui/button.tsx (extended via CVA variants). Domain
#    action buttons (delete-product-button.tsx, sign-out-button.tsx)
#    are kebab-case and don't trigger this check.
hits=$(git ls-files '**/[A-Z]*Button.tsx' '**/[A-Z]*Button.ts' 2>/dev/null)
if [ -n "$hits" ]; then
  fail "PascalCase *Button.tsx files (use components/ui/button.tsx variants)"
  printf '%s\n' "$hits"
else
  pass "no PascalCase *Button.tsx files"
fi

# Check #6 — terracotta-500 paint inventory baseline — retired at
# the close of Phase B (Slice 8). The check counted every
# `var(--color-terracotta-500)` paint in production code and held
# the count at TC500_BASELINE=11 across 7 slices of editorial
# churn. With the port closed it would block legitimate new uses
# (a future filled-button placement, a new display-em accent)
# while never actually verifying that any individual paint
# satisfied WCAG. The canonical guard going forward is the
# Permitted/Forbidden lists in docs/design/contrast.md (see the
# "Post-Phase-B enforcement" subsection). If automated terracotta-
# 500 enforcement is needed again, the right tool is a contrast-
# aware lint rule (token + size + AA/AALarge aware), not a string
# count — that's a separate scope.

if [ "$ok" -eq 1 ]; then
  printf '\nAll 5 Phase B precommit checks clean.\n'
  exit 0
else
  printf '\nAt least one Phase B precommit check failed.\n'
  exit 1
fi
