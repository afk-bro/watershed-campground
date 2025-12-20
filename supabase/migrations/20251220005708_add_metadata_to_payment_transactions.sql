-- =====================================================
-- Add missing columns to payment_transactions
-- =====================================================
-- Stores payment type and additional metadata

ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.payment_transactions.type IS 'Payment type (e.g., deposit, full, remainder)';
COMMENT ON COLUMN public.payment_transactions.metadata IS 'Additional payment metadata including Stripe data, pricing breakdown, and policy information';
