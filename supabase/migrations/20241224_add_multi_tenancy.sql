-- Multi-Tenancy Migration
-- This migration adds organization support and tenant isolation

-- ============================================================================
-- STEP 1: Create Organizations Infrastructure
-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Organization mapping (many-to-many)
CREATE TABLE IF NOT EXISTS user_organizations (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org ON user_organizations(organization_id);

-- Demo seed locks table (for atomic locking)
CREATE TABLE IF NOT EXISTS demo_seed_locks (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL REFERENCES auth.users(id),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed'
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_demo_locks_status ON demo_seed_locks(status);

-- ============================================================================
-- STEP 2: Add organization_id columns (nullable initially)
-- ============================================================================

ALTER TABLE campsites ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE blackout_dates ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================================================
-- STEP 3: Create default organization and backfill
-- ============================================================================

-- Insert default organization (idempotent)
INSERT INTO organizations (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Watershed Campground', 'watershed')
ON CONFLICT (id) DO NOTHING;

-- Backfill existing data with default organization
UPDATE campsites 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE reservations 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE blackout_dates 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

UPDATE audit_logs 
SET organization_id = '00000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

-- ============================================================================
-- STEP 4: Add constraints and indexes
-- ============================================================================

-- Make organization_id NOT NULL
ALTER TABLE campsites ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE reservations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE blackout_dates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE campsites 
ADD CONSTRAINT fk_campsites_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE reservations 
ADD CONSTRAINT fk_reservations_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE blackout_dates 
ADD CONSTRAINT fk_blackout_dates_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campsites_org ON campsites(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_org ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_blackout_dates_org ON blackout_dates(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

-- ============================================================================
-- STEP 5: Update RLS Policies for Tenant Isolation
-- ============================================================================

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID)
RETURNS UUID AS $$
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_organizations.user_id = $1 
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Campsites policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON campsites;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON campsites;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON campsites;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON campsites;

CREATE POLICY "Users can view their org's campsites"
ON campsites FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Service role has full access to campsites"
ON campsites FOR ALL
TO service_role
USING (true);

-- Reservations policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON reservations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON reservations;

CREATE POLICY "Users can view their org's reservations"
ON reservations FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Service role has full access to reservations"
ON reservations FOR ALL
TO service_role
USING (true);

-- Blackout dates policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON blackout_dates;

CREATE POLICY "Users can view their org's blackout dates"
ON blackout_dates FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Service role has full access to blackout dates"
ON blackout_dates FOR ALL
TO service_role
USING (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON audit_logs;

CREATE POLICY "Users can view their org's audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Service role has full access to audit logs"
ON audit_logs FOR ALL
TO service_role
USING (true);

-- ============================================================================
-- STEP 6: Assign current admin users to default organization
-- ============================================================================

-- This will need to be run manually or via a separate script
-- to assign existing admin users to the default organization
-- Example:
-- INSERT INTO user_organizations (user_id, organization_id, role)
-- SELECT id, '00000000-0000-0000-0000-000000000001', 'owner'
-- FROM auth.users
-- WHERE email IN ('admin@example.com')
-- ON CONFLICT DO NOTHING;
