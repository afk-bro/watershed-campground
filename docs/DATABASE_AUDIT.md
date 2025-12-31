# Database Performance Audit

## Index Coverage Analysis

### Core Tables

#### `reservations`
**Existing Indexes**:
```sql
-- Primary key
reservations_pkey (id)

-- Organization scoping
idx_reservations_org (organization_id)

-- Campsite lookups
idx_reservations_campsite (campsite_id)

-- Date range queries
idx_reservations_check_in (check_in)
idx_reservations_check_out (check_out)

-- Status filtering
idx_reservations_status (status)
```

**Query Patterns**:
✅ `WHERE organization_id = ? AND status = ?` - Covered by org index + status index
✅ `WHERE campsite_id = ? AND check_in >= ? AND check_out <= ?` - Covered
✅ `WHERE organization_id = ? ORDER BY check_in DESC` - Covered

**Recommendations**:
- ✅ **Well-indexed** - No immediate action needed
- Monitor for slow queries on date range filters (if logs show issues, consider composite index on org + check_in)

---

#### `campsites`
**Existing Indexes**:
```sql
campsites_pkey (id)
idx_campsites_org (organization_id)
idx_campsites_code (code) -- Unique constraint
idx_campsites_active (is_active) WHERE is_active = true
```

**Query Patterns**:
✅ `WHERE organization_id = ? AND is_active = true` - Covered
✅ `WHERE code = ?` - Covered (unique lookups)

**Recommendations**:
- ✅ **Well-indexed** - No action needed

---

#### `blackout_dates`
**Existing Indexes**:
```sql
blackout_dates_pkey (id)
idx_blackout_org (organization_id)
idx_blackout_campsite (campsite_id)
idx_blackout_dates (start_date, end_date)
```

**Query Patterns**:
✅ `WHERE organization_id = ? AND campsite_id = ?` - Covered
✅ `WHERE campsite_id = ? AND start_date <= ? AND end_date >= ?` - Covered

**Recommendations**:
- ✅ **Well-indexed** - No action needed

---

#### `admin_audit_logs` (NEW)
**Existing Indexes**:
```sql
admin_audit_logs_pkey (id)

-- Primary query: org + recent
idx_admin_audit_org_time (organization_id, created_at DESC)

-- Actor search
idx_admin_audit_actor (actor_user_id, created_at DESC)

-- Resource lookup
idx_admin_audit_resource (resource_type, resource_id)

-- Action type
idx_admin_audit_action (action, created_at DESC)

-- Request tracing (sparse)
idx_admin_audit_request (request_id) WHERE request_id IS NOT NULL

-- Failure analysis (partial)
idx_admin_audit_failures (organization_id, created_at DESC) WHERE status = 'failure'
```

**Query Patterns**:
✅ `WHERE organization_id = ? ORDER BY created_at DESC` - Covered by org_time
✅ `WHERE action = ? ORDER BY created_at DESC` - Covered by action index
✅ `WHERE actor_user_id = ?` - Covered by actor index
✅ `WHERE request_id = ?` - Covered by sparse request index

**Recommendations**:
- ✅ **Well-indexed** - Excellent coverage with specialized indexes
- Monitor table size monthly (see AUDIT_LOGGING.md retention policy)

---

## Search Patterns (ILIKE)

### `reservations` search endpoints

**Potential Slow Query**:
```sql
SELECT * FROM reservations
WHERE organization_id = ?
  AND (
    first_name ILIKE '%smith%' OR
    last_name ILIKE '%smith%' OR
    email ILIKE '%smith%'
  )
LIMIT 50;
```

**Status**: ⚠️ **ILIKE on text fields can be slow on large datasets**

**Solutions**:

**Option A: Trigram Indexes (Recommended for 10K+ rows)**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_reservations_name_trgm
  ON reservations USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

CREATE INDEX idx_reservations_email_trgm
  ON reservations USING gin (email gin_trgm_ops);
```

**Option B: Full-text Search (Better for complex queries)**
```sql
-- Add tsvector column
ALTER TABLE reservations ADD COLUMN search_vector tsvector;

-- Populate and maintain
UPDATE reservations SET search_vector =
  to_tsvector('english', coalesce(first_name, '') || ' ' ||
                         coalesce(last_name, '') || ' ' ||
                         coalesce(email, ''));

CREATE TRIGGER reservations_search_update
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english',
                          first_name, last_name, email);

-- Index
CREATE INDEX idx_reservations_search ON reservations USING gin(search_vector);

-- Query
SELECT * FROM reservations
WHERE organization_id = ?
  AND search_vector @@ to_tsquery('smith')
LIMIT 50;
```

**Recommendation**: Monitor search query performance. If P95 > 500ms, implement **Option A** (trigram) first (simpler, works for partial matches).

---

## "List 5000" Anti-Pattern Prevention

### Current Safeguards

✅ **Pagination enforced**:
- `GET /api/admin/reservations` - Default limit: 50, max: 200
- `GET /api/admin/campsites` - Default limit: 100, max: 500
- `GET /api/admin/audit-logs` - Default limit: 50, max: 200

✅ **Searchable + Filterable**:
- Reservations: Filter by status, campsite, date range
- Audit logs: Filter by action, actor, resource, date range

**No "SELECT * FROM table" without WHERE/LIMIT found** ✅

### Recommendations

**1. Add cursor-based pagination for very large result sets** (Future enhancement):
```typescript
// Instead of offset-based (slow for large offsets)
GET /api/admin/reservations?limit=50&offset=5000  // ❌ Slow

// Use cursor-based (fast, consistent)
GET /api/admin/reservations?limit=50&after=<last_id>  // ✅ Fast
```

**2. Add "export to CSV" for bulk access** (instead of raising limits):
- Prevents UI slowdown from large JSON payloads
- Better UX for compliance/reporting needs

**3. Monitor query durations in logs**:
```sql
-- Enable slow query logging (PostgreSQL config)
ALTER SYSTEM SET log_min_duration_statement = 500;  -- Log queries > 500ms
```

---

## Query Performance Budget

### Target Metrics (P95)

| Endpoint Category | P95 Target | Current Status |
|-------------------|------------|----------------|
| Simple lookups (by ID) | < 50ms | ✅ Expected |
| List endpoints (50 items) | < 200ms | 🔄 Measure with perf baseline |
| Search endpoints (ILIKE) | < 500ms | ⚠️ Monitor |
| Complex aggregations | < 1000ms | 🔄 Measure |

**Action**: Run `npm run perf:baseline` to establish current baselines.

---

## Multi-Tenancy Performance

### RLS Policy Impact

All tables use RLS policies with `organization_id` filters.

**Performance Impact**: Minimal if indexes on `organization_id` are present (they are).

**Verification Query**:
```sql
-- Check if org filter is using index
EXPLAIN ANALYZE
SELECT * FROM reservations
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
LIMIT 50;

-- Should show: "Index Scan using idx_reservations_org"
```

**If seeing "Seq Scan"** (sequential scan):
1. Check if index exists: `\d reservations`
2. Run `ANALYZE reservations;` to update stats
3. Check table size - indexes only help when table is large (> 1000 rows)

---

## Connection Pooling (Production)

### Current Setup

**Development**: Direct Supabase client (connection per request)
**Production**: Supabase handles pooling via PgBouncer

**Recommendation**: No action needed - Supabase manages this.

**If self-hosting PostgreSQL**:
```typescript
// Use connection pooling library
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
});
```

---

## N+1 Query Prevention

### Current Patterns

**✅ Good**: Using `.select()` with joins
```typescript
// app/api/admin/reservations/route.ts
const { data } = await supabaseAdmin
  .from('reservations')
  .select('*, campsites(id, name, code)')  // ✅ Single query with join
  .eq('organization_id', organizationId);
```

**❌ Bad** (not found in codebase, but watch for):
```typescript
// Fetch reservations
const reservations = await getReservations();

// Then fetch campsite for each (N+1 query)
for (const res of reservations) {
  const campsite = await getCampsite(res.campsite_id);  // ❌ N queries
}
```

**Recommendation**: Continue using `.select('*, related_table(*)')` pattern for joins.

---

## Monitoring Checklist

### Weekly

- [ ] Check slow query log (if enabled)
- [ ] Review `admin_audit_logs` table size
- [ ] Check for missing indexes via `pg_stat_user_tables` (unused indexes, high seq scans)

### Monthly

- [ ] Run performance baseline script: `npm run perf:baseline`
- [ ] Compare with previous baseline (check for regressions)
- [ ] Review table sizes: `SELECT pg_size_pretty(pg_total_relation_size(tablename))`
- [ ] Vacuum analyze: `VACUUM ANALYZE;` (Supabase does this automatically)

### Quarterly

- [ ] Review index usage: `pg_stat_user_indexes` (drop unused indexes)
- [ ] Consider partitioning large tables (if > 1M rows)
- [ ] Review RLS policy performance (if org count > 100)

---

## Index Recommendations Summary

| Table | Status | Action |
|-------|--------|--------|
| `reservations` | ✅ Well-indexed | Monitor date range queries |
| `campsites` | ✅ Well-indexed | None |
| `blackout_dates` | ✅ Well-indexed | None |
| `admin_audit_logs` | ✅ Excellent coverage | Monitor table size monthly |
| `user_organizations` | ✅ Has org + user indexes | None |

**Overall**: 🟢 **Database is well-optimized for current workload**

**Next Review**: After implementing trigram search (if needed) or when table sizes exceed 100K rows.
