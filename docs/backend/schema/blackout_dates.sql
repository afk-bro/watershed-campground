-- Create blackout_dates table
CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  campsite_id UUID REFERENCES campsites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent end_date before start_date
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_blackout_dates_range ON blackout_dates (start_date, end_date);
