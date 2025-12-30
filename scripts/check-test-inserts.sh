#!/bin/bash
# CI Check: Prevent raw .insert() calls in test files
# Usage: ./scripts/check-test-inserts.sh

echo "🔍 Checking for raw .insert() calls in test files..."

# Find all .spec.ts files with .insert() calls, excluding factories.ts
VIOLATIONS=$(grep -r "\.insert(" tests/ --include="*.spec.ts" | grep -v "factories.ts" | grep -v "helpers/") || true

if [ -n "$VIOLATIONS" ]; then
    echo "❌ ERROR: Direct .insert() calls found in test files!"
    echo ""
    echo "Files with violations:"
    echo "$VIOLATIONS"
    echo ""
    echo "📌 Use factories from tests/helpers/factories.ts instead:"
    echo "   - createTestCampsite()"
    echo "   - createTestReservation()"
    echo "   - createTestBlackout()"
    echo ""
    exit 1
else
    echo "✅ No raw .insert() calls found in test files"
    exit 0
fi
