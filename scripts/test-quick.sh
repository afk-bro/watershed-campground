#!/bin/bash

# ============================================
# Quick Test Run
# ============================================
# Runs smoke tests only for quick validation
#
# Usage:
#   ./scripts/test-quick.sh
# ============================================

echo "Running quick smoke tests..."
npx playwright test tests/admin/smoke.spec.ts "$@"
