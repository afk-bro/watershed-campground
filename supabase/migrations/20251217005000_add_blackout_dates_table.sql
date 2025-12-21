-- ============================================
-- Add blackout_dates table
-- ============================================
-- This table stores date ranges when campsites are unavailable
-- Supports both campground-wide blackouts and site-specific blackouts

CREATE TABLE IF NOT EXISTS public.blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Date range
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Optional reason for blackout
  reason text,

  -- Optional campsite (NULL means applies to all campsites)
  campsite_id uuid REFERENCES public.campsites(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT check_blackout_dates CHECK (end_date >= start_date)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_blackout_dates_range ON public.blackout_dates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_blackout_dates_campsite_id ON public.blackout_dates(campsite_id);

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE TRIGGER update_blackout_dates_updated_at
  BEFORE UPDATE ON public.blackout_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read blackout dates (needed for availability checks)
CREATE POLICY "Public can read blackout dates"
  ON public.blackout_dates
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated admins have full access
CREATE POLICY "Admins full access to blackout dates"
  ON public.blackout_dates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to blackout dates"
  ON public.blackout_dates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Migration complete!
-- ============================================
