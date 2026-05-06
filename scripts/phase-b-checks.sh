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

# 6. terracotta-500 paint inventory baseline. Slice 4 documented
#    exactly TC500_BASELINE permitted production paints in
#    docs/design/contrast.md (filled-button surfaces, decorative
#    focus rings, display em accent, eyebrow ::before hairline).
#    Any growth above the baseline fails CI so the diff surfaces
#    in code review and either gets fixed or consciously bumped
#    against the contrast.md inventory in the same PR.
#
#    Grep counts every `var(--color-terracotta-500)` paint in
#    production code (includes app/, components/, lib/) and excludes
#    _design-reference/ + *.test.* files. Comments that reference
#    the colour by *name* don't include the CSS variable syntax so
#    they don't inflate the count.
TC500_BASELINE=10
# Markdown / mdx prose that references the CSS variable inside
# inline code blocks is documentation, not a paint — exclude .md
# and .mdx via pathspec so the count stays focused on actual
# stylesheet + JSX paints. Test files are also excluded so
# negative-assertion strings in regression guards don't inflate.
TC500_PATHSPEC=(
  ':!*_design-reference*'
  ':!*.test.tsx' ':!*.test.ts'
  ':!*.md' ':!*.mdx'
)
tc500_count=$(git grep -hI -o 'var(--color-terracotta-500)' \
  -- "${TC500_PATHSPEC[@]}" 'app' 'components' 'lib' \
  2>/dev/null | wc -l | tr -d ' ')
if [ "$tc500_count" -gt "$TC500_BASELINE" ]; then
  fail "terracotta-500 paint count drift: $tc500_count > baseline $TC500_BASELINE"
  printf '%s\n' "Audit against docs/design/contrast.md inventory:"
  git grep -nI 'var(--color-terracotta-500)' \
    -- "${TC500_PATHSPEC[@]}" 'app' 'components' 'lib' 2>/dev/null
elif [ "$tc500_count" -lt "$TC500_BASELINE" ]; then
  # Fewer paints is healthy progress, but the baseline (and the
  # contrast.md inventory) need updating in the same PR. Report
  # rather than fail so a deliberate cleanup doesn't block work,
  # but make the drift visible in CI output.
  pass "terracotta-500 paint count: $tc500_count (below baseline $TC500_BASELINE — bump TC500_BASELINE + contrast.md)"
else
  pass "terracotta-500 paint count at baseline ($tc500_count)"
fi

if [ "$ok" -eq 1 ]; then
  printf '\nAll 6 Phase B precommit checks clean.\n'
  exit 0
else
  printf '\nAt least one Phase B precommit check failed.\n'
  exit 1
fi
