#!/usr/bin/env bash
# Phase B precommit invariants. Run before every Phase B commit;
# zero matches required across all five checks.
#
# Usage:
#   bash scripts/phase-b-checks.sh
#
# Exit codes:
#   0  all checks clean
#   1  at least one check found a violation
#
# Each check is documented in docs/design/sessions/phase-b.md.

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

if [ "$ok" -eq 1 ]; then
  printf '\nAll 5 Phase B precommit checks clean.\n'
  exit 0
else
  printf '\nAt least one Phase B precommit check failed.\n'
  exit 1
fi
