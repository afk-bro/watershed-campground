-- ============================================
-- Test Seed Data for E2E Tests
-- ============================================
-- This file is SAFE for all environments (local, preview, production)
-- Uses ON CONFLICT to avoid errors when data already exists
--
-- ⚠️  NOTE: This file is designed for E2E test environments
--     If you don't want test fixtures in production, don't run this file there
--     Validation at the end assumes E2E test data (strict counts)
--
-- For LOCAL-ONLY destructive cleanup, see: supabase/seed.local.sql
--
-- In tests: Run `npm run test:db:reset` which runs migrations, then seed.local.sql, then this
-- In production: This file would run via sql_paths, but you may want to skip it

-- ============================================
-- 1. Create Admin User for Testing
-- ============================================
-- Note: This creates a test admin user with email/password auth
-- Email: admin@test.com
-- Password: testpass123
-- User ID is deterministic for consistent test expectations

-- Insert into auth.users (Supabase Auth)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@test.com',
  crypt('testpass123', gen_salt('bf')), -- Password: testpass123
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Insert identity for the user
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::text,
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001'::text, 'email', 'admin@test.com'),
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Assign admin user to default organization
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'owner')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Seed Campsites
-- ============================================
INSERT INTO public.campsites (id, code, name, type, max_guests, base_rate, is_active, sort_order, notes, organization_id) VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'S1', 'Riverfront Site 1', 'rv', 4, 45.00, true, 1, 'Premium riverfront location with full hookups', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'S2', 'Riverfront Site 2', 'rv', 4, 45.00, true, 2, 'Premium riverfront location with full hookups', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'S3', 'Riverfront Site 3', 'rv', 6, 50.00, true, 3, 'Large riverfront site with full hookups', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'S4', 'Forest Site 4', 'tent', 4, 30.00, true, 4, 'Shaded tent site near hiking trails', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'S5', 'Forest Site 5', 'tent', 2, 25.00, true, 5, 'Cozy tent site with fire pit', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'C1', 'Cabin Alpha', 'cabin', 6, 120.00, true, 10, 'Two-bedroom cabin with kitchen', '00000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'C2', 'Cabin Beta', 'cabin', 4, 100.00, true, 11, 'One-bedroom cabin with kitchenette', '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (code) DO NOTHING;  -- Business key: campsite code must be unique

-- ============================================
-- 3. Seed Reservations
-- ============================================
-- Create a mix of assigned and unassigned reservations
INSERT INTO public.reservations (
  id,
  campsite_id,
  first_name,
  last_name,
  email,
  phone,
  address1,
  city,
  postal_code,
  check_in,
  check_out,
  adults,
  children,
  camping_unit,
  rv_length,
  contact_method,
  status,
  total_amount,
  stripe_payment_intent_id,
  organization_id
) VALUES
  -- Assigned reservation #1 (confirmed)
  (
    '20000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid, -- Assigned to S1
    'John',
    'Doe',
    'john.doe@test.com',
    '555-0100',
    '123 Main St',
    'Portland',
    '97201',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '9 days',
    2,
    1,
    'rv',
    '25',
    'email',
    'confirmed',
    90.00,
    'pi_test_assigned_1',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  -- Assigned reservation #2 (confirmed)
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000004'::uuid, -- Assigned to S4 (tent)
    'Jane',
    'Smith',
    'jane.smith@test.com',
    '555-0101',
    '456 Oak Ave',
    'Eugene',
    '97401',
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '16 days',
    2,
    0,
    'tent',
    NULL,
    'email',
    'confirmed',
    60.00,
    'pi_test_assigned_2',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  -- UNASSIGNED reservation (pending) - critical for testing assignment flow
  (
    '20000000-0000-0000-0000-000000000003'::uuid,
    NULL, -- NO campsite assigned
    'Bob',
    'Johnson',
    'bob.johnson@test.com',
    '555-0102',
    '789 Pine Rd',
    'Bend',
    '97701',
    CURRENT_DATE + INTERVAL '21 days',
    CURRENT_DATE + INTERVAL '23 days',
    4,
    2,
    'rv',
    '30',
    'email',
    'pending',
    100.00,
    'pi_test_unassigned',
    '00000000-0000-0000-0000-000000000001'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Seed Validation - Fail Loud if Incomplete!
-- ============================================
-- ⚠️  E2E TEST VALIDATION - Checks for specific test fixture counts
-- This is intentionally strict for E2E environments
-- If running in production, you may want to skip/modify this section

DO $$
DECLARE
  campsite_count INT;
  reservation_count INT;
  admin_exists BOOLEAN;
BEGIN
  -- Count seed data
  SELECT COUNT(*) INTO campsite_count
  FROM public.campsites
  WHERE id::text LIKE '10000000%';

  SELECT COUNT(*) INTO reservation_count
  FROM public.reservations
  WHERE id::text LIKE '20000000%';

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com')
  INTO admin_exists;

  -- Validate E2E test fixture counts
  IF campsite_count < 7 THEN
    RAISE EXCEPTION '❌ E2E SEED FAILED: Expected >= 7 test campsites, got %. Did seed.local.sql run first?', campsite_count;
  END IF;

  IF reservation_count < 3 THEN
    RAISE EXCEPTION '❌ E2E SEED FAILED: Expected >= 3 test reservations, got %. Did seed.local.sql run first?', reservation_count;
  END IF;

  IF NOT admin_exists THEN
    RAISE EXCEPTION '❌ E2E SEED FAILED: Test admin (admin@test.com) not found';
  END IF;

  -- Success!
  RAISE NOTICE '✓ E2E seed validation passed:';
  RAISE NOTICE '  - % test campsites seeded', campsite_count;
  RAISE NOTICE '  - % test reservations seeded', reservation_count;
  RAISE NOTICE '  - Test admin (admin@test.com) exists';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for E2E testing!';
END $$;

-- ============================================
-- Seed Complete!
-- ============================================
-- Test credentials:
-- Email: admin@test.com
-- Password: testpass123
-- ============================================
