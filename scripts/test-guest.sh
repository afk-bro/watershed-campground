#!/bin/bash

# ============================================
# Run Guest Test Suite
# ============================================
# Runs all public-facing tests (no auth)
#
# Usage:
#   ./scripts/test-guest.sh          # Run all guest tests
#   ./scripts/test-guest.sh --headed # Run with browser UI
#   ./scripts/test-guest.sh --debug  # Run in debug mode
# ============================================

echo "Running guest test suite..."
npx playwright test --project=guest "$@"
