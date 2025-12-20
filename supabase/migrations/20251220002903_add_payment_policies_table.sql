-- =====================================================
-- Payment Policies Table
-- =====================================================
-- Stores flexible payment policies that can be applied
-- to bookings based on campsite, season, and other criteria

CREATE TABLE payment_policies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('full', 'deposit')),
    deposit_type TEXT CHECK (deposit_type IN ('percent', 'fixed')),
    deposit_value NUMERIC(10, 2),
    due_days_before_checkin INTEGER,
    site_type TEXT,
    campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
    start_month INTEGER CHECK (start_month >= 1 AND start_month <= 12),
    end_month INTEGER CHECK (end_month >= 1 AND end_month <= 12),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_payment_policies_campsite_id ON payment_policies(campsite_id);
CREATE INDEX idx_payment_policies_site_type ON payment_policies(site_type);
CREATE INDEX idx_payment_policies_policy_type ON payment_policies(policy_type);

-- RLS Policies (public read access, admin-only write)
ALTER TABLE payment_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment policies are viewable by everyone"
    ON payment_policies FOR SELECT
    USING (true);

CREATE POLICY "Payment policies are insertable by authenticated users only"
    ON payment_policies FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Payment policies are updatable by authenticated users only"
    ON payment_policies FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Payment policies are deletable by authenticated users only"
    ON payment_policies FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- Seed Data: Default Payment Policies
-- =====================================================

-- Default: Pay in Full (Universal Fallback)
INSERT INTO payment_policies (id, name, policy_type, due_days_before_checkin)
VALUES
    ('default', 'Pay in Full', 'full', 0);

-- Example: 50% Deposit for Peak Season (June-August)
INSERT INTO payment_policies (name, policy_type, deposit_type, deposit_value, due_days_before_checkin, start_month, end_month)
VALUES
    ('Peak Season 50% Deposit', 'deposit', 'percent', 50, 14, 6, 8);

-- Example: Fixed $50 Deposit for Tent Sites
INSERT INTO payment_policies (name, policy_type, deposit_type, deposit_value, due_days_before_checkin, site_type)
VALUES
    ('Tent Site Deposit', 'deposit', 'fixed', 50, 7, 'tent');

-- Add a comment for documentation
COMMENT ON TABLE payment_policies IS 'Flexible payment policies that determine deposit requirements based on campsite type, specific sites, and seasonal periods';
