-- ============================================================================
-- Admin Audit Logs
-- ============================================================================
-- Creates a dedicated table for tracking admin actions (separate from
-- automatic database trigger auditing in the existing audit_logs table).
--
-- Purpose: Track who did what, when, and where for admin mutations
-- Fail-open: Application code should never fail if audit logging fails
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Temporal
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Actor (who)
  actor_user_id UUID NOT NULL, -- References auth.users (no FK to avoid cascade issues)
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'admin',

  -- Action (what)
  action TEXT NOT NULL, -- Format: "resource.verb" e.g. "reservation.assign"

  -- Resource (to what)
  resource_type TEXT NOT NULL, -- e.g. "reservation", "blackout", "campsite"
  resource_id TEXT NOT NULL,

  -- Request correlation
  request_id UUID, -- For correlating logs across services
  ip_address TEXT,
  user_agent TEXT,

  -- Outcome
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error_code TEXT,
  error_message TEXT,

  -- Details (flexible JSON for action-specific data)
  metadata JSONB,

  -- Validation
  CONSTRAINT valid_action_format CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary query pattern: org + recent actions
CREATE INDEX idx_admin_audit_org_time
  ON public.admin_audit_logs(organization_id, created_at DESC);

-- Query by actor
CREATE INDEX idx_admin_audit_actor
  ON public.admin_audit_logs(actor_user_id, created_at DESC);

-- Query by resource
CREATE INDEX idx_admin_audit_resource
  ON public.admin_audit_logs(resource_type, resource_id);

-- Query by action type
CREATE INDEX idx_admin_audit_action
  ON public.admin_audit_logs(action, created_at DESC);

-- Request correlation (only index non-null values)
CREATE INDEX idx_admin_audit_request
  ON public.admin_audit_logs(request_id)
  WHERE request_id IS NOT NULL;

-- Failed operations
CREATE INDEX idx_admin_audit_failures
  ON public.admin_audit_logs(organization_id, created_at DESC)
  WHERE status = 'failure';

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view audit logs for their organization(s)
CREATE POLICY admin_audit_logs_org_isolation
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only authenticated users can insert (service role bypasses RLS)
CREATE POLICY admin_audit_logs_insert
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.admin_audit_logs IS
  'Audit trail for admin mutations. Tracks who did what, when, and where. Never fails main operations.';

COMMENT ON COLUMN public.admin_audit_logs.action IS
  'Action in format: resource.verb (e.g. reservation.assign, blackout.create)';

COMMENT ON COLUMN public.admin_audit_logs.metadata IS
  'Action-specific data (before/after values, changed fields, etc.)';

COMMENT ON COLUMN public.admin_audit_logs.request_id IS
  'Correlation ID for tracking request across services';

COMMENT ON COLUMN public.admin_audit_logs.status IS
  'Whether the action succeeded or failed (for debugging)';
