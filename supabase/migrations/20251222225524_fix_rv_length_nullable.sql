-- Fix rv_length to be nullable (was incorrectly set to NOT NULL in remote schema)
-- Reservations without RVs should have NULL rv_length

-- First make the column nullable so we can clean up data
ALTER TABLE public.reservations
ALTER COLUMN rv_length DROP NOT NULL;

-- Now fix any invalid existing data (empty strings, "0", etc.)
UPDATE public.reservations
SET rv_length = NULL
WHERE rv_length IS NOT NULL
  AND (rv_length = '' OR rv_length = '0' OR rv_length !~ '^[1-9][0-9]?$');

-- Re-add the constraint that allows NULL or valid positive integers
ALTER TABLE public.reservations
ADD CONSTRAINT check_rv_length_valid
CHECK (rv_length IS NULL OR rv_length ~ '^[1-9][0-9]?$');

COMMENT ON CONSTRAINT check_rv_length_valid ON public.reservations IS 'Ensures rv_length is either NULL (no RV) or a positive integer string (1-99 feet)';


