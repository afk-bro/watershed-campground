-- ============================================
-- Phase 2: Campsites + Availability System
-- Migration: Create campsites table and update reservations
-- ============================================

-- ============================================
-- 1. Create campsites table
-- ============================================
CREATE TABLE public.campsites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Core fields
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('rv', 'tent', 'cabin')),
  max_guests integer NOT NULL CHECK (max_guests > 0),
  base_rate numeric(10,2) NOT NULL CHECK (base_rate >= 0),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT campsites_code_uppercase CHECK (code = UPPER(code))
);

-- ============================================
-- 2. Indexes for campsites
-- ============================================
CREATE INDEX idx_campsites_type ON public.campsites(type);
CREATE INDEX idx_campsites_is_active ON public.campsites(is_active);
CREATE INDEX idx_campsites_sort_order ON public.campsites(sort_order);
CREATE INDEX idx_campsites_code ON public.campsites(code);

-- ============================================
-- 3. Trigger for campsites updated_at
-- ============================================
CREATE TRIGGER update_campsites_updated_at
  BEFORE UPDATE ON public.campsites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Add campsite_id to reservations
-- ============================================
ALTER TABLE public.reservations
  ADD COLUMN campsite_id uuid REFERENCES public.campsites(id);

CREATE INDEX idx_reservations_campsite_id ON public.reservations(campsite_id);

-- ============================================
-- 5. RLS Policies for campsites
-- ============================================
ALTER TABLE public.campsites ENABLE ROW LEVEL SECURITY;

-- Public (anon) can only read active campsites
CREATE POLICY "Public can read active campsites only"
  ON public.campsites
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated admins have full access to campsites
CREATE POLICY "Admins full access to campsites"
  ON public.campsites
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to campsites"
  ON public.campsites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Update RLS Policies for reservations
-- ============================================
-- Drop the existing public insert policy and recreate with same name
-- (This ensures public can still insert reservations via the form)
DROP POLICY IF EXISTS "Allow public inserts" ON public.reservations;

CREATE POLICY "Allow public inserts"
  ON public.reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Note: We intentionally do NOT create a public SELECT policy
-- Public access to reservations is handled via magic links through API routes
-- that use the service_role key

-- ============================================
-- 7. Optional: Insert sample campsites for testing
-- ============================================
-- Uncomment these if you want sample data for development:

-- INSERT INTO public.campsites (code, name, type, max_guests, base_rate, is_active, sort_order, notes) VALUES
--   ('S1', 'Riverfront Site 1', 'rv', 4, 45.00, true, 1, 'Premium riverfront location with full hookups'),
--   ('S2', 'Riverfront Site 2', 'rv', 4, 45.00, true, 2, 'Premium riverfront location with full hookups'),
--   ('S3', 'Riverfront Site 3', 'rv', 6, 50.00, true, 3, 'Large riverfront site with full hookups'),
--   ('S4', 'Forest Site 4', 'tent', 4, 30.00, true, 4, 'Shaded tent site near hiking trails'),
--   ('S5', 'Forest Site 5', 'tent', 2, 25.00, true, 5, 'Cozy tent site with fire pit'),
--   ('C1', 'Cabin Alpha', 'cabin', 6, 120.00, true, 10, 'Two-bedroom cabin with kitchen'),
--   ('C2', 'Cabin Beta', 'cabin', 4, 100.00, true, 11, 'One-bedroom cabin with kitchenette');

-- ============================================
-- Migration complete!
-- ============================================
