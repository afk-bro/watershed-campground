-- =====================================================
-- Add check constraints for data integrity
-- =====================================================
-- Enforce NULL vs 0 semantics and valid value ranges

-- rv_length: NULL (no RV) or positive integer string (1-99 feet)
-- Pattern ensures no leading zeros, no zero value
ALTER TABLE public.reservations
ADD CONSTRAINT check_rv_length_valid
CHECK (rv_length IS NULL OR rv_length ~ '^[1-9][0-9]?$');

-- adults: must be at least 1 (required)
ALTER TABLE public.reservations
ADD CONSTRAINT check_adults_min
CHECK (adults >= 1);

-- children: must be 0 or positive
ALTER TABLE public.reservations
ADD CONSTRAINT check_children_min
CHECK (children >= 0);

-- total_amount: must be positive (can't have free or negative reservations)
ALTER TABLE public.reservations
ADD CONSTRAINT check_total_amount_positive
CHECK (total_amount > 0);

-- Comments for documentation
COMMENT ON CONSTRAINT check_rv_length_valid ON public.reservations IS 'Ensures rv_length is either NULL (no RV) or a positive integer string (1-99 feet)';
COMMENT ON CONSTRAINT check_adults_min ON public.reservations IS 'At least 1 adult required per reservation';
COMMENT ON CONSTRAINT check_children_min ON public.reservations IS 'Children count must be 0 or positive';
COMMENT ON CONSTRAINT check_total_amount_positive ON public.reservations IS 'Total amount must be positive (no free or negative reservations)';
