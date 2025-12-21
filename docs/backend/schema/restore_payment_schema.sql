-- Run this in Supabase SQL Editor to restore missing payment tables

-- 1. Payment Policies (Rules)
CREATE TABLE IF NOT EXISTS public.payment_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  end_month integer CHECK (end_month BETWEEN 1 AND 12)
);

-- 2. Payment Transactions Ledger
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reservation_id uuid REFERENCES public.reservations(id) NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'cad',
  type text NOT NULL CHECK (type IN ('deposit', 'balance', 'full', 'refund')),
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  stripe_payment_intent_id text,
  metadata jsonb
);

-- 3. Enable RLS
ALTER TABLE public.payment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Allow public read of payment policies" ON public.payment_policies;
CREATE POLICY "Allow public read of payment policies" ON public.payment_policies FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow service_role full access policies" ON public.payment_policies;
CREATE POLICY "Allow service_role full access policies" ON public.payment_policies FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access transactions" ON public.payment_transactions;
CREATE POLICY "Allow service_role full access transactions" ON public.payment_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read own transactions" ON public.payment_transactions;
CREATE POLICY "Allow authenticated read own transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (true);
