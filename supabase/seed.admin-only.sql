-- ============================================
-- Admin User Only Seed
-- ============================================
-- Creates ONLY the test admin user
-- No test reservations, campsites, or other data
-- Use with: scripts/db-reset-clean.sh

-- ============================================
-- 1. Create Admin User for Testing
-- ============================================
-- Email: admin@test.com
-- Password: testpass123

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

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✓ Admin user created (admin@test.com / testpass123)';
END $$;
