-- Enable btree_gist extension for exclusion constraints on date ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping reservations for the same campsite
-- This ensures that no two active reservations for the same campsite can have overlapping dates
--
-- How it works:
-- - campsite_id WITH = : Same campsite
-- - check_in, check_out WITH && : Overlapping date ranges
-- - Only applies to reservations with status in ('pending', 'confirmed', 'checked_in')
--
-- Note: We filter by status using a WHERE clause to only prevent overlaps for active reservations
-- Cancelled or completed reservations can overlap without issues

ALTER TABLE reservations
ADD CONSTRAINT prevent_overlapping_reservations
EXCLUDE USING gist (
    campsite_id WITH =,
    tsrange(check_in::timestamp, check_out::timestamp) WITH &&
)
WHERE (status IN ('pending', 'confirmed', 'checked_in') AND campsite_id IS NOT NULL);

-- Add comment for future reference
COMMENT ON CONSTRAINT prevent_overlapping_reservations ON reservations IS
'Prevents double-booking by ensuring no two active reservations can have overlapping dates for the same campsite. Only applies to pending, confirmed, and checked-in reservations.';
