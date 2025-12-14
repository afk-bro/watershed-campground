-- ============================================
-- Phase 4: Hardening
-- Migration: Webhook Idempotency & Rate Limiting
-- ============================================

-- 1. Webhook Events Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id text PRIMARY KEY, -- Stores the Stripe Event ID (evt_...)
  type text NOT NULL, -- e.g. 'payment_intent.succeeded'
  status text NOT NULL DEFAULT 'processed',
  created_at timestamptz DEFAULT now()
);

-- RLS: Only service role can access
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies needed if we only use service_role, but good practice:
CREATE POLICY "Service role full access to webhooks"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY, -- e.g. 'ip:127.0.0.1:create_pi'
  count integer DEFAULT 1,
  expires_at bigint NOT NULL -- Unix timestamp
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON public.rate_limits(expires_at);

-- RLS: Only service role can access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to rate_limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
