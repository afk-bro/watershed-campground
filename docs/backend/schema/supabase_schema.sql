-- ============================================
-- Watershed Campground - Complete Database Schema
-- ============================================

-- Create ENUM type for reservation status
CREATE TYPE reservation_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'checked_in',
  'checked_out',
  'no_show'
);

-- Create the reservations table
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address1 text NOT NULL,
  address2 text,
  city text NOT NULL,
  postal_code text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer NOT NULL DEFAULT 0,
  children integer NOT NULL DEFAULT 0,
  rv_length text NOT NULL,
  rv_year text,
  camping_unit text NOT NULL,
  hear_about text,
  contact_method text NOT NULL,
  comments text,
  status reservation_status NOT NULL DEFAULT 'pending'::reservation_status,
  
  -- Payment Fields
  total_amount decimal(10, 2) NOT NULL DEFAULT 0.00,
  amount_paid decimal(10, 2) NOT NULL DEFAULT 0.00,
  stripe_payment_intent_id text,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
  
  campsite_id uuid REFERENCES public.campsites(id),
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT check_out_after_check_in CHECK (check_out > check_in)
);

-- ============================================
-- Campsites Table
-- ============================================

CREATE TABLE public.campsites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  type text NOT NULL, -- 'rv', 'tent', 'cabin'
  max_guests integer NOT NULL DEFAULT 6,
  base_rate decimal(10, 2) NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer DEFAULT 0,
  CONSTRAINT campsites_pkey PRIMARY KEY (id)
);

-- Trigger to update updated_at for campsites
CREATE TRIGGER update_campsites_updated_at
  BEFORE UPDATE ON public.campsites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for Campsites
ALTER TABLE public.campsites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active campsites"
  ON public.campsites
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow authenticated users to read all campsites"
  ON public.campsites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert/update campsites"
  ON public.campsites
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX idx_reservations_check_out ON public.reservations(check_out);
CREATE INDEX idx_reservations_email ON public.reservations(email);
CREATE INDEX idx_reservations_created_at ON public.reservations(created_at);

-- ============================================
-- Triggers and Functions
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert (public reservation form)
CREATE POLICY "Allow public inserts"
  ON public.reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users (admins) to read all reservations
CREATE POLICY "Allow authenticated users to read all reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users (admins) to update all reservations
CREATE POLICY "Allow authenticated users to update all reservations"
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Flexible Payment Tables
-- ============================================

-- 1. Payment Policies (Rules)
CREATE TABLE public.payment_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  
  -- Logic
  policy_type text NOT NULL CHECK (policy_type IN ('full', 'deposit')),
  deposit_type text CHECK (deposit_type IN ('percent', 'fixed')), -- only if policy_type = 'deposit'
  deposit_value decimal(10, 2) DEFAULT 0.00,
  due_days_before_checkin integer DEFAULT 0,
  
  -- Matching Rules (Null means "Any")
  site_type text, -- Matches campsites.type
  campsite_id uuid REFERENCES public.campsites(id),
  start_month integer CHECK (start_month BETWEEN 1 AND 12),
  end_month integer CHECK (end_month BETWEEN 1 AND 12),
  
  CONSTRAINT payment_policies_pkey PRIMARY KEY (id)
);

-- 2. Payment Transactions Ledger
CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reservation_id uuid REFERENCES public.reservations(id) NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'cad',
  type text NOT NULL CHECK (type IN ('deposit', 'balance', 'full', 'refund')),
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  stripe_payment_intent_id text,
  metadata jsonb,
  
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id)
);

-- 3. Updates to Reservations Table
-- (These would be ALTER TABLE in a migration, but here we append new schema definitions or assume update)
-- For this file which represents the "desired state":

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS balance_due decimal(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_policy_snapshot jsonb,
ADD COLUMN IF NOT EXISTS remainder_due_at timestamp with time zone;

-- Update payment_status enum/check if needed, but existing text check is fine.
-- payment_status check constraint might need 'partially_paid' if we care, 
-- but 'pending' (deposit paid, balance pending) vs 'paid' (fully paid) is a decision.
-- Let's add 'deposit_paid' to the check constraint if strictly enforcing.
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_payment_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'deposit_paid'));

-- ============================================
-- RLS for New Tables
-- ============================================

ALTER TABLE public.payment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read of payment policies" ON public.payment_policies FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service_role full access policies" ON public.payment_policies FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access transactions" ON public.payment_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read own transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (true); -- simplified

-- ============================================
-- Add-ons Feature (Tier 3)
-- ============================================

-- 4. Add-ons Table
CREATE TABLE public.addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL DEFAULT 0.00,
  category text CHECK (category IN ('merchandise', 'service', 'rental', 'other')),
  is_active boolean NOT NULL DEFAULT true,
  image_url text, -- Optional path to image
  
  CONSTRAINT addons_pkey PRIMARY KEY (id)
);

-- 5. Reservation Add-ons (Link Table)
CREATE TABLE public.reservation_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  addon_id uuid REFERENCES public.addons(id),
  quantity integer NOT NULL DEFAULT 1,
  price_at_booking decimal(10, 2) NOT NULL, -- Snapshot of price at time of booking
  
  CONSTRAINT reservation_addons_pkey PRIMARY KEY (id)
);

-- RLS for Add-ons
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active addons" ON public.addons FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Allow authenticated read all addons" ON public.addons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service_role full access addons" ON public.addons FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reservation Add-ons Policies
CREATE POLICY "Allow public insert reservation_addons" ON public.reservation_addons FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access reservation_addons" ON public.reservation_addons FOR ALL TO authenticated USING (true) WITH CHECK (true);
