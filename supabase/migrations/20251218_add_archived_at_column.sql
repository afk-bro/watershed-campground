-- Add archived_at column to reservations table for soft delete/archive functionality
-- This allows admins to hide old reservations without permanently deleting them

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries filtering by archived_at
CREATE INDEX IF NOT EXISTS idx_reservations_archived_at ON reservations(archived_at);

-- Add comment explaining the column
COMMENT ON COLUMN reservations.archived_at IS 'Timestamp when reservation was archived. NULL means not archived (active).';
