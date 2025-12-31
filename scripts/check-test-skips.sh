#!/bin/bash
# CI Gate: Prevent new test skips without proper labels
#
# Usage: ./scripts/check-test-skips.sh [base-branch]
#
# Fails if new test.skip() or describe.skip() calls are introduced
# without a documented TODO tag (e.g., TODO(E2E-DRAG))

set -e

BASE_BRANCH="${1:-main}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🔍 Checking for new test skips on branch: $CURRENT_BRANCH (vs $BASE_BRANCH)"

# Patterns to check for
SKIP_PATTERNS=(
    "test\.skip"
    "describe\.skip"
    "test\.fixme"
)

# Find all test files changed in this PR
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"...HEAD | grep -E '\.(spec|test)\.(ts|tsx|js|jsx)$' || true)

if [ -z "$CHANGED_FILES" ]; then
    echo "✅ No test files changed - skip check passed"
    exit 0
fi

echo "📝 Checking test files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'

NEW_SKIPS_FOUND=false
VIOLATIONS=()

for file in $CHANGED_FILES; do
    # Skip if file doesn't exist (deleted files)
    if [ ! -f "$file" ]; then
        continue
    fi

    for pattern in "${SKIP_PATTERNS[@]}"; do
        # Find lines with skip pattern
        SKIP_LINES=$(grep -n "$pattern" "$file" || true)

        if [ -z "$SKIP_LINES" ]; then
            continue
        fi

        # Check each skip to see if it has a TODO tag
        while IFS= read -r line; do
            LINE_NUM=$(echo "$line" | cut -d: -f1)
            LINE_CONTENT=$(echo "$line" | cut -d: -f2-)

            # Check if this line was added in current branch (not in base)
            if git diff "$BASE_BRANCH"...HEAD -- "$file" | grep -qF "$LINE_CONTENT"; then
                # This is a new skip! Check if it has a TODO tag
                if ! echo "$LINE_CONTENT" | grep -qE 'TODO\([A-Z0-9-]+\)'; then
                    NEW_SKIPS_FOUND=true
                    VIOLATIONS+=("$file:$LINE_NUM - Missing TODO tag: $LINE_CONTENT")
                fi
            fi
        done <<< "$SKIP_LINES"
    done
done

# Check for placeholder #TBD in skips FIRST (prevents "we'll do it later" forever)
# This check runs on ALL skips, not just new ones
echo ""
echo "🔍 Checking for placeholder #TBD in skip messages..."

TBD_SKIPS=$(grep -rn 'test\.skip.*#TBD' tests/ --include="*.spec.ts" --include="*.test.ts" || true)

HAS_FAILURES=false

if [ -n "$TBD_SKIPS" ]; then
    HAS_FAILURES=true
    echo ""
    echo "❌ PLACEHOLDER #TBD FOUND IN TEST SKIPS"
    echo ""
    echo "The following skips have placeholder #TBD instead of real issue IDs:"
    echo ""
    echo "$TBD_SKIPS" | while IFS= read -r line; do
        echo "  ⚠️  $line"
    done
    echo ""
    echo "Action required:"
    echo "  1. Create a GitHub issue for this skip"
    echo "  2. Replace #TBD with real issue number (e.g., #123)"
    echo ""
    echo "Example:"
    echo "  test.skip(true, 'TODO(E2E-DRAG) (#123): Awaiting UX decision');"
    echo ""
fi

# Check for new skips without TODO tags
if [ "$NEW_SKIPS_FOUND" = true ]; then
    HAS_FAILURES=true
    echo ""
    echo "❌ NEW TEST SKIPS DETECTED WITHOUT PROPER LABELS"
    echo ""
    echo "The following test skips are missing TODO tags:"
    echo ""
    for violation in "${VIOLATIONS[@]}"; do
        echo "  ⚠️  $violation"
    done
    echo ""
    echo "Required format:"
    echo "  test.skip(true, 'TODO(ISSUE-ID): Reason for skip');"
    echo ""
    echo "Examples of valid TODO tags:"
    echo "  - TODO(E2E-DRAG): Awaiting UX decision on drag interaction"
    echo "  - TODO(GH-123): Blocked by upstream bug"
    echo "  - TODO(FLAKY): Intermittent timing issue, needs investigation"
    echo ""
    echo "If this skip is intentional, add a descriptive TODO tag and try again."
fi

if [ "$HAS_FAILURES" = true ]; then
    exit 1
fi

echo "✅ All test skips have proper TODO tags and no placeholders"
exit 0
