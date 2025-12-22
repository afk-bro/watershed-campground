#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Local Database Reset with E2E Seed Data
# ============================================
# For local development and CI testing only
# Runs the destructive seed.local.sql before
# the standard db reset process

echo "🔄 Resetting local database with E2E seed data..."

# Step 1: Run db reset (migrations + safe seed.sql)
echo "  → Running migrations and safe seed..."
npx supabase db reset

# Step 2: Run destructive local seed (truncate + reload)
echo "  → Running local destructive seed (truncate + reload)..."
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/seed.local.sql \
  -f supabase/seed.sql

echo "✅ Database reset complete!"
echo ""
echo "Test data loaded:"
echo "  - 7 campsites (S1-S5, C1-C2)"
echo "  - 3 reservations (John Doe, Jane Smith, Bob Johnson)"
echo "  - 1 admin user (admin@test.com / testpass123)"
