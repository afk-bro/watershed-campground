-- Make audit_logs.reservation_id nullable
-- This allows audit logs for non-reservation operations (blackouts, campsites, etc.)

ALTER TABLE public.audit_logs
  ALTER COLUMN reservation_id DROP NOT NULL;

-- Add index for better query performance when filtering by reservation_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_reservation_id
  ON public.audit_logs(reservation_id)
  WHERE reservation_id IS NOT NULL;
