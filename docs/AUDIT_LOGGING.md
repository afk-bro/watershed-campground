# Admin Audit Logging

## Overview

The admin audit logging system tracks all critical administrative mutations with complete context (who, what, when, where, why). This enables compliance, debugging, and accountability.

**Table**: `admin_audit_logs`
**Behavior**: Fail-open (never blocks main operations)
**Scope**: Organization-isolated via RLS

## Logged Actions

| Action | Endpoint | Metadata Captured |
|--------|----------|-------------------|
| `reservation.assign` | `POST /api/admin/reservations/[id]/assign` | from/to campsite_id, check_in/out, status_transition |
| `reservation.update` | `PATCH /api/admin/reservations/[id]` | campsite_id, status, check_in/out, email_sent |
| `blackout.create` | `POST /api/admin/blackout-dates` | campsite_id, start_date, end_date, reason |
| `blackout.update` | `PATCH /api/admin/blackout-dates/[id]` | campsite_id, before/after dates |
| `blackout.delete` | `DELETE /api/admin/blackout-dates/[id]` | campsite_id, start_date, end_date |

## Architecture

### Core Components

**`lib/audit/audit-logger.ts`**
- `auditLog(ctx, data)` - Main logging function (never throws)
- `auditLogFailure(ctx, data)` - For failed operations
- Auto-extracts: organization_id, actor (user_id, email, role), IP, user agent, request_id

**`lib/admin/with-admin-mutation.ts`**
- Wrapper for POST/PATCH/DELETE handlers
- Automatically logs success/failure
- Generates request IDs for correlation
- Consistent error response shape

### Data Schema

```typescript
{
  id: UUID,
  created_at: TIMESTAMPTZ,
  organization_id: UUID,           // Multi-tenant isolation

  // Actor (who)
  actor_user_id: UUID,
  actor_email: TEXT,
  actor_role: TEXT,

  // Action (what)
  action: TEXT,                    // Format: "resource.verb"

  // Resource (to what)
  resource_type: TEXT,             // "reservation", "blackout", etc.
  resource_id: TEXT,

  // Request correlation
  request_id: UUID,                // For tracing
  ip_address: TEXT,
  user_agent: TEXT,

  // Outcome
  status: "success" | "failure",
  error_code: TEXT,
  error_message: TEXT,

  // Details
  metadata: JSONB                  // Action-specific data
}
```

## Querying Audit Logs

### Via API

```bash
# Recent logs
GET /api/admin/audit-logs?limit=20

# Filter by action
GET /api/admin/audit-logs?action=reservation.assign

# Filter by resource
GET /api/admin/audit-logs?resource_type=reservation&resource_id=<uuid>

# Filter by actor
GET /api/admin/audit-logs?actor_user_id=<uuid>

# Filter by date range
GET /api/admin/audit-logs?start_date=2025-01-01&end_date=2025-01-31

# Filter failures
GET /api/admin/audit-logs?status=failure

# Trace request
GET /api/admin/audit-logs?request_id=<uuid>
```

### Direct SQL (Admin/Debugging)

```sql
-- Recent actions by user
SELECT created_at, action, resource_type, resource_id, status
FROM admin_audit_logs
WHERE actor_user_id = '<uuid>'
  AND organization_id = '<org_id>'
ORDER BY created_at DESC
LIMIT 50;

-- Failed operations
SELECT created_at, action, error_code, error_message
FROM admin_audit_logs
WHERE status = 'failure'
  AND organization_id = '<org_id>'
ORDER BY created_at DESC;

-- Trace a specific request
SELECT *
FROM admin_audit_logs
WHERE request_id = '<request_id>';

-- Activity by action type
SELECT action, COUNT(*),
       COUNT(*) FILTER (WHERE status = 'failure') as failures
FROM admin_audit_logs
WHERE organization_id = '<org_id>'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY COUNT(*) DESC;
```

## Retention Policy

**Current Strategy**: Keep all logs (low volume, high value for compliance)

**Future Considerations** (when volume becomes significant):

### Option A: Time-based retention (90 days in DB)
```sql
-- Scheduled job (run monthly)
DELETE FROM admin_audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Option B: Export to object storage
```sql
-- Before deletion, export to S3/GCS
-- Keep summary stats in DB, full details in cold storage
-- Useful for compliance (retain 7 years) without DB bloat
```

### Option C: Partition by month
```sql
-- For high volume: partition table by created_at month
-- Drop/archive old partitions easily
-- Requires PostgreSQL 10+
```

**Recommendation**: Monitor table size monthly. If exceeds 100K rows or 1GB, implement Option B (export old logs to S3, keep 90 days in DB).

## PII Guardrails

### Current Metadata Allowlist

Audit metadata should contain **business context**, not **guest PII**.

**✅ SAFE to include**:
- campsite_id (business ID)
- check_in / check_out (dates)
- status, status_transition (enums)
- from_campsite_id / to_campsite_id
- email_sent (boolean flag)
- reason (admin-entered notes)

**❌ AVOID** (use resource_id instead):
- guest first_name / last_name
- guest email / phone
- guest address
- payment details (ever!)

### Sanitization Helper (Future Enhancement)

If you need to log complex objects, use a sanitization helper:

```typescript
// lib/audit/sanitize-metadata.ts (EXAMPLE - not yet implemented)
const ALLOWED_KEYS = [
  'campsite_id', 'from_campsite_id', 'to_campsite_id',
  'check_in', 'check_out', 'start_date', 'end_date',
  'status', 'status_transition', 'email_sent', 'reason'
];

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => ALLOWED_KEYS.includes(key))
  );
}
```

**When to implement**: If you start logging full reservation objects or receive PII compliance requirements.

## Alerting & Monitoring

### Key Metrics to Track

**1. Failure Rate by Action**
```sql
SELECT action,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'failure') as failures,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failure') / COUNT(*), 2) as failure_rate
FROM admin_audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND organization_id = '<org_id>'
GROUP BY action
HAVING COUNT(*) FILTER (WHERE status = 'failure') > 0;
```

**2. Unusual Activity Patterns**
- Spike in `blackout.delete` (potential accidental bulk delete)
- Repeated `reservation.assign` failures (conflict issues)
- High volume from single actor (potential automation/mistake)

### Recommended Alerts (Week 3+)

**Critical** (Slack/PagerDuty):
- Failure rate > 10% for any action (1-hour window)
- More than 5 consecutive failures from same actor

**Warning** (Email digest):
- Daily summary of failures
- Weekly action volume trends

**Example Alerting Query**:
```sql
-- Run every hour, alert if > 5 failures
SELECT COUNT(*) as failure_count
FROM admin_audit_logs
WHERE status = 'failure'
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Fail-Open Behavior

**Critical Design Principle**: Audit logging NEVER blocks business operations.

### How It Works

1. All mutations wrapped in try/catch
2. Errors logged to console (not thrown)
3. Main operation proceeds regardless of audit success
4. Failed audit writes are logged but don't affect response

### Testing Fail-Open (Staging Only)

```typescript
// In lib/audit/audit-logger.ts (temporary test flag)
const FORCE_AUDIT_FAILURE = process.env.TEST_AUDIT_FAILURE === 'true';

if (FORCE_AUDIT_FAILURE) {
  throw new Error('Simulated audit failure');
}
```

**Expected Behavior**:
- ✅ Mutation succeeds (reservation assigned, blackout created)
- ✅ API returns 200 OK
- ✅ Error logged to console: `[Audit] Failed to write audit log`
- ❌ No audit log row created (expected)

## Performance Considerations

### Indexes (Already Implemented)

```sql
-- Primary query: org + recent
CREATE INDEX idx_admin_audit_org_time
  ON admin_audit_logs(organization_id, created_at DESC);

-- Actor search
CREATE INDEX idx_admin_audit_actor
  ON admin_audit_logs(actor_user_id, created_at DESC);

-- Resource lookup
CREATE INDEX idx_admin_audit_resource
  ON admin_audit_logs(resource_type, resource_id);

-- Action type
CREATE INDEX idx_admin_audit_action
  ON admin_audit_logs(action, created_at DESC);

-- Request tracing (sparse index)
CREATE INDEX idx_admin_audit_request
  ON admin_audit_logs(request_id)
  WHERE request_id IS NOT NULL;

-- Failure analysis (partial index)
CREATE INDEX idx_admin_audit_failures
  ON admin_audit_logs(organization_id, created_at DESC)
  WHERE status = 'failure';
```

### Query Performance Tips

**✅ Good**:
```sql
-- Uses idx_admin_audit_org_time
SELECT * FROM admin_audit_logs
WHERE organization_id = '<org>'
ORDER BY created_at DESC
LIMIT 50;

-- Uses idx_admin_audit_action
SELECT * FROM admin_audit_logs
WHERE action = 'reservation.assign'
ORDER BY created_at DESC;
```

**❌ Slow** (avoid in production):
```sql
-- Full table scan (metadata JSONB search)
SELECT * FROM admin_audit_logs
WHERE metadata->>'campsite_id' = '<id>';

-- Use resource_id instead
SELECT * FROM admin_audit_logs
WHERE resource_id = '<id>';
```

## Maintenance

### Monthly Checklist

1. **Review table size**:
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('admin_audit_logs'));
   ```

2. **Check failure rate**:
   ```sql
   SELECT COUNT(*) FILTER (WHERE status = 'failure') * 100.0 / COUNT(*)
   FROM admin_audit_logs
   WHERE created_at > NOW() - INTERVAL '30 days';
   ```

3. **Verify RLS policies** (if adding new org):
   - Create test user in org A, org B
   - Verify org A cannot read org B logs via API

4. **Review top error codes**:
   ```sql
   SELECT error_code, COUNT(*)
   FROM admin_audit_logs
   WHERE status = 'failure'
     AND created_at > NOW() - INTERVAL '30 days'
   GROUP BY error_code
   ORDER BY COUNT(*) DESC;
   ```

## Migration & Rollout

### Pre-Deployment Checklist

- [ ] Apply migration in staging/dev first
- [ ] Verify RLS with two test orgs (A cannot read B's logs)
- [ ] Run guardrail test: `npx playwright test tests/admin/audit-logging.spec.ts`
- [ ] Manual smoke test: 3 mutations + query `GET /api/admin/audit-logs?limit=20`
- [ ] Test fail-open behavior (staging only, force audit failure)

### Rollback Plan

If issues occur:

1. **API endpoints still work** (fail-open design)
2. To disable logging temporarily:
   ```typescript
   // In lib/audit/audit-logger.ts
   const AUDIT_ENABLED = process.env.ENABLE_AUDIT_LOGS !== 'false';
   if (!AUDIT_ENABLED) return;
   ```
3. To drop table (extreme, lose all logs):
   ```sql
   DROP TABLE admin_audit_logs CASCADE;
   ```

## Future Enhancements

### Week 3+

- [ ] **Alerting**: Daily digest of failures
- [ ] **Dashboard**: Admin UI to browse audit logs
- [ ] **Export**: CSV download for compliance
- [ ] **Metadata sanitization**: Explicit PII allowlist
- [ ] **Retention automation**: Cron job to archive/delete old logs

### Long-term

- [ ] **Diff viewer**: Before/after comparison UI
- [ ] **Anomaly detection**: ML-based unusual activity alerts
- [ ] **Compliance reports**: Automated quarterly exports
- [ ] **Real-time streaming**: Push critical actions to webhook/Slack

## References

- Migration: `supabase/migrations/20251231_admin_audit_logs.sql`
- Audit logger: `lib/audit/audit-logger.ts`
- Wrapper middleware: `lib/admin/with-admin-mutation.ts`
- Guardrail test: `tests/admin/audit-logging.spec.ts`
- API viewer: `app/api/admin/audit-logs/route.ts`
