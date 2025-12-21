-- Add email tracking column to reservations table
-- This enables idempotent email sending from webhooks

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Add index for querying unsent emails
CREATE INDEX IF NOT EXISTS idx_reservations_email_sent ON public.reservations(email_sent_at);

-- Add comment
COMMENT ON COLUMN public.reservations.email_sent_at IS 'Timestamp when confirmation email was sent (for idempotency)';
