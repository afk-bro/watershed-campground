-- =====================================================
-- Add metadata column to reservations
-- =====================================================
-- Stores additional context like user agent, referrer,
-- form submission details, and other audit information
-- that doesn't warrant its own dedicated column

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.reservations.metadata IS 'Additional reservation metadata including user agent, referrer, IP address, and other contextual information for audit purposes';
