#!/bin/bash
# CI Gate: Prevent .first() usage on campsite selectors
#
# Usage: ./scripts/check-campsite-selectors.sh
#
# Fails if tests select campsites using .first() which causes 409 conflicts

set -e

echo "🔍 Checking for anti-pattern: campsite selection with .first() or .nth(0)"

# Pattern: locator with "campsite" followed by .first() or .nth(0) WITHOUT specific ID scoping
# This catches:
#   - page.locator('[data-testid*="campsite-"]').first()
#   - page.locator('[data-testid*="campsite-"]').nth(0)
# But allows:
#   - page.locator('[data-campsite-id="SPECIFIC-ID"]').first()
# Also excludes visibility checks: expect(...first()).toBeVisible()
VIOLATIONS=$(grep -rn 'campsite.*\.\(first()\|nth(0)\)' tests/ --include="*.spec.ts" --include="*.test.ts" | \
    grep -v 'data-campsite-id=' | \
    grep -v '\.toBeVisible' | \
    grep -v '//' | \
    grep -v '// OK:' | \
    grep -v '// ALLOWED:' || true)

if [ -n "$VIOLATIONS" ]; then
    echo ""
    echo "❌ CAMPSITE .first() ANTI-PATTERN DETECTED"
    echo ""
    echo "The following tests select campsites using .first() which causes 409 conflicts:"
    echo ""
    echo "$VIOLATIONS" | while IFS= read -r line; do
        echo "  ⚠️  $line"
    done
    echo ""
    echo "Why this fails:"
    echo "  - Parallel tests both select .first() → same campsite"
    echo "  - Both try to assign → 409 Conflict"
    echo ""
    echo "How to fix:"
    echo "  1. Use createDedicatedCampsite({ codePrefix: 'MYTEST' })"
    echo "  2. Select by unique code: .filter({ hasText: code })"
    echo ""
    echo "Example:"
    echo "  const { code, cleanup } = await createDedicatedCampsite({ codePrefix: 'LIFECYCLE' });"
    echo "  try {"
    echo "    const option = page.locator('[data-testid=\"campsite-option\"]')"
    echo "      .filter({ hasText: code });"
    echo "    await option.click();"
    echo "  } finally {"
    echo "    await cleanup();"
    echo "  }"
    echo ""
    echo "See: docs/testing/testids.md (Anti-.first() Rule)"
    exit 1
fi

echo "✅ No .first() campsite selectors found"
exit 0
