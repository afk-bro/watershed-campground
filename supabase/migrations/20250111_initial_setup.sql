-- ============================================
-- Phase 1: Initial Setup and Helper Functions
-- ============================================

-- ============================================
-- 1. Create update_updated_at_column function
-- ============================================
-- This function is used by triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. Create reservations table (if Phase 1 is missing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Guest information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address1 text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,

  -- Reservation details
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer NOT NULL CHECK (adults > 0),
  children integer NOT NULL DEFAULT 0 CHECK (children >= 0),
  camping_unit text NOT NULL, -- 'rv', 'tent', 'cabin'
  rv_length text,
  contact_method text NOT NULL, -- 'email', 'phone', 'text'

  -- Status and payment
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  stripe_payment_intent_id text,

  -- Constraints
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- ============================================
-- 3. Create payment_transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
  stripe_payment_intent_id text,
  stripe_charge_id text,
  error_message text
);

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reservations_email ON public.reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON public.reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_stripe_pi ON public.reservations(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reservation_id ON public.payment_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_pi ON public.payment_transactions(stripe_payment_intent_id);

-- ============================================
-- 5. Triggers
-- ============================================
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Public can insert reservations
CREATE POLICY "Allow public inserts"
  ON public.reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Service role full access to reservations"
  ON public.reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to payment_transactions"
  ON public.payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (admin) have full access
CREATE POLICY "Authenticated full access to reservations"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated full access to payment_transactions"
  ON public.payment_transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Migration complete!
-- ============================================
