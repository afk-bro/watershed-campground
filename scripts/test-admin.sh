#!/bin/bash

# ============================================
# Run Admin Test Suite
# ============================================
# Runs all admin panel tests (requires auth)
#
# Usage:
#   ./scripts/test-admin.sh          # Run all admin tests
#   ./scripts/test-admin.sh --headed # Run with browser UI
#   ./scripts/test-admin.sh --debug  # Run in debug mode
# ============================================

echo "Running admin test suite..."
npx playwright test --project=admin "$@"
