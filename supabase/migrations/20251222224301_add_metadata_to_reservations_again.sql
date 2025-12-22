-- Ensure metadata column exists on reservations (idempotent)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.reservations.metadata IS 'Additional reservation metadata including user agent, referrer, IP address, and other contextual information for audit purposes';
