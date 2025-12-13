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

-- Policy: Allow service_role full access (for API routes using service key)
CREATE POLICY "Allow service_role full access"
  ON public.reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
