# Audit Logging Specification

**Purpose:** Track admin mutations for security, compliance, and troubleshooting.

---

## Audit Log Schema

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Auto-generated | `123e4567-e89b-12d3-...` |
| `timestamp` | Timestamp | When action occurred | `2025-12-31T10:30:00Z` |
| `organization_id` | UUID | Organization context | `00000000-0000-...` |
| `actor_user_id` | UUID | Who performed action | `user-uuid` |
| `actor_email` | String | Actor's email | `admin@example.com` |
| `actor_role` | String | Actor's role | `admin` |
| `action` | String | What happened | `reservation.assign` |
| `resource_type` | String | Entity type | `reservation` |
| `resource_id` | UUID/String | Entity ID | `res-uuid` |
| `request_id` | UUID | Correlate logs | `req-uuid` |
| `ip_address` | String | Client IP | `192.168.1.1` |
| `user_agent` | String | Client info | `Mozilla/5.0...` |
| `status` | Enum | `success` \| `failure` | `success` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `error_code` | String | If status=failure | `CONFLICT_ERROR` |
| `error_message` | String | If status=failure | `Dates overlap` |
| `metadata` | JSONB | Action-specific data | See below |

---

## Action Types & Metadata

### 1. Reservation Assignment

**Action:** `reservation.assign`

**Metadata:**
```json
{
  "from_campsite_id": "uuid-or-null",
  "to_campsite_id": "uuid",
  "check_in": "2025-06-01",
  "check_out": "2025-06-07",
  "status_transition": "pending -> confirmed"
}
```

### 2. Reservation Update

**Action:** `reservation.update`

**Metadata:**
```json
{
  "changed_fields": ["status", "check_in"],
  "before": {
    "status": "pending",
    "check_in": "2025-06-01"
  },
  "after": {
    "status": "confirmed",
    "check_in": "2025-06-02"
  }
}
```

### 3. Blackout Date Create

**Action:** `blackout.create`

**Metadata:**
```json
{
  "campsite_id": "uuid",
  "start_date": "2025-07-01",
  "end_date": "2025-07-07",
  "reason": "Maintenance"
}
```

### 4. Blackout Date Update

**Action:** `blackout.update`

**Metadata:**
```json
{
  "campsite_id": "uuid",
  "before": {
    "start_date": "2025-07-01",
    "end_date": "2025-07-07"
  },
  "after": {
    "start_date": "2025-07-01",
    "end_date": "2025-07-10"
  }
}
```

### 5. Blackout Date Delete

**Action:** `blackout.delete`

**Metadata:**
```json
{
  "campsite_id": "uuid",
  "start_date": "2025-07-01",
  "end_date": "2025-07-07",
  "reason": "Canceled"
}
```

---

## Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Temporal
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Actor
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,

  -- Action
  action TEXT NOT NULL, -- e.g. "reservation.assign"

  -- Resource
  resource_type TEXT NOT NULL, -- e.g. "reservation"
  resource_id TEXT NOT NULL,

  -- Request
  request_id UUID,
  ip_address TEXT,
  user_agent TEXT,

  -- Outcome
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_code TEXT,
  error_message TEXT,

  -- Details
  metadata JSONB,

  -- Indexes
  CONSTRAINT valid_action CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id) WHERE request_id IS NOT NULL;

-- RLS Policy (org-scoped)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_org_isolation ON audit_logs
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));
```

---

## Fail-Open Behavior

**Critical:** Audit logging must NEVER break the main operation.

```typescript
try {
  await auditLog(ctx, logData);
} catch (error) {
  logger.error('Audit log failed (non-blocking):', error);
  // Continue with main operation
}
```

**Rationale:** Missing one audit entry is better than blocking a critical business operation.

---

## Query Patterns

### Recent actions by organization
```sql
SELECT * FROM audit_logs
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

### Actions for specific resource
```sql
SELECT * FROM audit_logs
WHERE resource_type = 'reservation'
  AND resource_id = $1
  AND organization_id = $2
ORDER BY created_at DESC;
```

### Failed operations
```sql
SELECT * FROM audit_logs
WHERE organization_id = $1
  AND status = 'failure'
ORDER BY created_at DESC
LIMIT 50;
```

### Admin activity audit
```sql
SELECT
  actor_email,
  action,
  COUNT(*) as count,
  MAX(created_at) as last_action
FROM audit_logs
WHERE organization_id = $1
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY actor_email, action
ORDER BY count DESC;
```

---

## Integration Points

### 1. Service Layer
```typescript
// In reservation.service.ts
await auditLog(ctx, {
  action: 'reservation.assign',
  resourceType: 'reservation',
  resourceId: reservationId,
  metadata: { from_campsite_id, to_campsite_id }
});
```

### 2. API Middleware
```typescript
// withAdminMutation wrapper automatically logs
export const POST = withAdminMutation('reservation.assign', async (ctx) => {
  // Audit happens automatically
  return result;
});
```

### 3. Manual (for complex flows)
```typescript
// For operations with multiple steps
await auditLog(ctx, {
  action: 'bulk_operation.assign_random',
  resourceType: 'batch',
  resourceId: batchId,
  metadata: { reservation_count: 50, success: 45, failed: 5 }
});
```

---

## Testing Requirements

### Guardrail Test
```typescript
test('creates audit log on campsite assignment', async () => {
  const requestId = crypto.randomUUID();

  await fetch('/api/admin/reservations/123/assign', {
    method: 'POST',
    headers: { 'x-request-id': requestId },
    body: JSON.stringify({ campsite_id: 'site-1' })
  });

  // Assert audit log exists
  const auditLog = await db
    .from('audit_logs')
    .select('*')
    .eq('request_id', requestId)
    .single();

  expect(auditLog.action).toBe('reservation.assign');
  expect(auditLog.resource_id).toBe('123');
  expect(auditLog.status).toBe('success');
});
```

---

## Retention Policy

**Recommended:**
- Keep 90 days in primary table
- Archive to cold storage after 90 days
- Purge after 2 years (or per compliance requirements)

```sql
-- Archive old logs (run monthly)
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

**Document Owner:** Development Team
**Last Updated:** 2025-12-31
**Status:** Ready for Implementation
