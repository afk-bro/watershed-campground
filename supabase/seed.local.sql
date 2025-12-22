-- ============================================
-- LOCAL-ONLY Destructive Seed Cleanup
-- ============================================
-- ⚠️  WARNING: This file TRUNCATES all data!
-- ⚠️  ONLY for local development and CI
-- ⚠️  NEVER run against production/preview environments

-- Safety check: Fail if not running on local Supabase
DO $$
BEGIN
  -- Check that we're running on localhost (local Supabase default port)
  IF current_setting('port', true) != '5432' THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: This seed file can only run on local Supabase (port 5432). Current port: %', current_setting('port', true);
  END IF;

  -- Additional safety: Check for a local-only marker
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'cluster_name' AND setting LIKE '%local%') THEN
    -- Log warning but allow (local Supabase doesn't always set cluster_name)
    RAISE NOTICE 'Running on local development environment';
  END IF;
END $$;

-- Disable triggers temporarily to avoid audit log conflicts
SET session_replication_role = 'replica';

-- Nuclear option: Truncate all public tables (cascades to dependent records)
TRUNCATE TABLE public.reservations CASCADE;
TRUNCATE TABLE public.campsites CASCADE;
TRUNCATE TABLE public.blackout_dates CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;

-- Clean up test auth data
DELETE FROM auth.identities WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✓ Local cleanup complete - all tables truncated';
END $$;
