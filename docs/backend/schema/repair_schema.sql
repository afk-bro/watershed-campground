-- Run this in the Supabase SQL Editor to update your database schema
-- It adds the missing columns to 'reservations' and ensures Add-on tables exist.

-- 1. Update Reservations Table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS balance_due decimal(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_policy_snapshot jsonb,
ADD COLUMN IF NOT EXISTS remainder_due_at timestamp with time zone;

-- Update Payment Status Check
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_payment_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'deposit_paid'));

-- 2. Create Add-ons Tables (if they don't exist)
CREATE TABLE IF NOT EXISTS public.addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL DEFAULT 0.00,
  category text CHECK (category IN ('merchandise', 'service', 'rental', 'other')),
  is_active boolean NOT NULL DEFAULT true,
  image_url text
);

CREATE TABLE IF NOT EXISTS public.reservation_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  addon_id uuid REFERENCES public.addons(id),
  quantity integer NOT NULL DEFAULT 1,
  price_at_booking decimal(10, 2) NOT NULL
);

-- 3. Enable RLS for New Tables
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_addons ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop first to avoid errors if exist)
DROP POLICY IF EXISTS "Allow public read of active addons" ON public.addons;
CREATE POLICY "Allow public read of active addons" ON public.addons FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS "Allow authenticated read all addons" ON public.addons;
CREATE POLICY "Allow authenticated read all addons" ON public.addons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service_role full access addons" ON public.addons;
CREATE POLICY "Allow service_role full access addons" ON public.addons FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert reservation_addons" ON public.reservation_addons;
CREATE POLICY "Allow public insert reservation_addons" ON public.reservation_addons FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access reservation_addons" ON public.reservation_addons;
CREATE POLICY "Allow authenticated full access reservation_addons" ON public.reservation_addons FOR ALL TO authenticated USING (true) WITH CHECK (true);
