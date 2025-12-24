#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Clear All Reservations from Local Database
# ============================================
# For local development only
# Clears all reservations and related data
# while keeping campsites and other config

echo "🗑️  Clearing all reservations from local database..."

# Connect to local Supabase database and clear reservations
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" << EOF
-- Disable all triggers on reservations to avoid constraint issues
ALTER TABLE reservations DISABLE TRIGGER USER;

-- Clear the tables (audit_logs first to avoid FK constraint)
DELETE FROM audit_logs;
DELETE FROM payment_transactions;
DELETE FROM reservations;

-- Re-enable triggers
ALTER TABLE reservations ENABLE TRIGGER USER;

-- Verify deletions
SELECT 'Reservations' as table_name, COUNT(*) as row_count FROM reservations
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'Payment Transactions', COUNT(*) FROM payment_transactions;
EOF

echo "✅ All reservations cleared!"
echo ""
echo "💡 To refresh the frontend UI:"
echo "   1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   2. Or clear browser cache and reload"
echo "   3. Or restart the Next.js dev server"
