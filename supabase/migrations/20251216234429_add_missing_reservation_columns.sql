-- Add missing columns to reservations table
-- These columns are used by the booking API but were not in the original schema

-- Guest address line 2 (optional)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS address2 text;

-- RV year (optional)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS rv_year text;

-- Marketing: How did they hear about us
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS hear_about text;

-- Additional comments from guest
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS comments text;

-- Secure token for managing reservation (hashed)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS public_edit_token_hash text;

-- Campsite assignment
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS campsite_id uuid REFERENCES public.campsites(id) ON DELETE SET NULL;

-- Enhanced payment tracking
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'; -- 'pending', 'paid', 'deposit_paid', 'refunded', etc.

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) DEFAULT 0 CHECK (amount_paid >= 0);

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS balance_due numeric(10,2) DEFAULT 0 CHECK (balance_due >= 0);

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS payment_policy_snapshot jsonb; -- Snapshot of payment policy at time of booking

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS remainder_due_at timestamptz; -- When remainder payment is due

-- Add index on campsite_id for performance
CREATE INDEX IF NOT EXISTS idx_reservations_campsite_id ON public.reservations(campsite_id);

-- Add index on public_edit_token_hash for quick lookups
CREATE INDEX IF NOT EXISTS idx_reservations_token_hash ON public.reservations(public_edit_token_hash);

-- Add comments for documentation
COMMENT ON COLUMN public.reservations.address2 IS 'Optional second line of guest address';
COMMENT ON COLUMN public.reservations.public_edit_token_hash IS 'SHA-256 hash of the magic link token for managing reservation';
COMMENT ON COLUMN public.reservations.campsite_id IS 'Assigned campsite for this reservation';
COMMENT ON COLUMN public.reservations.payment_status IS 'Current payment status of the reservation';
COMMENT ON COLUMN public.reservations.payment_policy_snapshot IS 'Snapshot of the payment policy at time of booking (for audit trail)';
COMMENT ON COLUMN public.reservations.remainder_due_at IS 'Timestamp when remaining balance is due (for deposit bookings)';
