#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Local Database Reset with E2E Seed Data
# ============================================
# For local development and CI testing only
# Runs the destructive seed.local.sql before
# the standard db reset process

echo "🔄 Resetting local database with E2E seed data..."

# Safety: require explicit opt-in to run destructive local reset
if [ "${LOCAL_SUPABASE:-}" != "1" ]; then
  echo "LOCAL_SUPABASE=1 required for local reset. Skipping." >&2
  echo "To run a local reset, set LOCAL_SUPABASE=1 and re-run this script." >&2
  exit 0
fi
# Step 1: Run db reset (migrations + safe seed.sql)
echo "  → Running migrations and safe seed..."
npx supabase db reset

# Step 2: Run destructive local seed (truncate + reload)
echo "  → Running local destructive seed (truncate + reload)..."
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/seeds/dev_seed.sql

echo "✅ Database reset complete!"
echo ""
echo "Test data loaded:"
echo "  - 7 campsites (S1-S5, C1-C2)"
echo "  - 3 reservations (John Doe, Jane Smith, Bob Johnson)"
echo "  - 1 admin user (admin@test.com / testpass123)"
