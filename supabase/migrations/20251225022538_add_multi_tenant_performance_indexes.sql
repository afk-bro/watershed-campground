-- ============================================
-- Multi-Tenant Performance Indexes
--
-- These indexes optimize overlap queries that check for
-- reservation and blackout conflicts within an organization.
--
-- Query Pattern:
--   SELECT ... FROM reservations
--   WHERE organization_id = $1
--     AND campsite_id = $2
--     AND check_in < $3
--     AND check_out > $4
-- ============================================

-- ============================================
-- Reservations Table Indexes
-- ============================================

-- Index 1: Org + Campsite + Date Range (most selective)
-- Used by: conflict checks in booking flow, calendar queries
-- Example: "Show me all reservations for Site 5 in Org A that overlap with June 1-5"
CREATE INDEX IF NOT EXISTS idx_reservations_org_campsite_dates
ON public.reservations (organization_id, campsite_id, check_in, check_out)
WHERE status IN ('pending', 'confirmed', 'checked_in');

-- Index 2: Org + Date Range (for availability searches without specific campsite)
-- Used by: availability engine searching across all campsites
-- Example: "Show me all active reservations in Org A during June"
CREATE INDEX IF NOT EXISTS idx_reservations_org_dates
ON public.reservations (organization_id, check_in, check_out)
WHERE status IN ('pending', 'confirmed', 'checked_in');

-- ============================================
-- Blackout Dates Table Indexes
-- ============================================

-- Index 3: Org + Campsite + Date Range
-- Used by: blackout conflict checks, calendar display
-- Example: "Show me all blackouts for Site 5 in Org A that overlap with June 1-5"
CREATE INDEX IF NOT EXISTS idx_blackout_dates_org_campsite_dates
ON public.blackout_dates (organization_id, campsite_id, start_date, end_date);

-- Index 4: Org + Date Range (for global blackouts and availability checks)
-- Used by: checking if any blackout blocks a date range
-- Example: "Show me all blackouts in Org A during June"
CREATE INDEX IF NOT EXISTS idx_blackout_dates_org_dates
ON public.blackout_dates (organization_id, start_date, end_date);

-- ============================================
-- Comments for Future Maintenance
-- ============================================

COMMENT ON INDEX idx_reservations_org_campsite_dates IS
'Multi-tenant overlap query optimization. Used by booking conflict checks and calendar queries. Partial index on active statuses only.';

COMMENT ON INDEX idx_reservations_org_dates IS
'Multi-tenant availability search optimization. Used when searching across all campsites in an org.';

COMMENT ON INDEX idx_blackout_dates_org_campsite_dates IS
'Multi-tenant blackout conflict optimization. Used by booking flow to check blackout overlaps.';

COMMENT ON INDEX idx_blackout_dates_org_dates IS
'Multi-tenant blackout search optimization. Used by calendar and availability checks.';

-- ============================================
-- Performance Notes
-- ============================================

-- These indexes are CRITICAL for multi-tenant performance because:
--
-- 1. Without org scoping, queries would scan entire tables
-- 2. Date range queries (check_in < X AND check_out > Y) are expensive without indexes
-- 3. Composite indexes on (org, campsite, dates) enable index-only scans
-- 4. Partial indexes on active statuses reduce index size by ~30%
--
-- Expected Impact:
-- - Availability checks: 100ms+ → <10ms
-- - Calendar loads: 500ms+ → <50ms
-- - Conflict validation: 200ms+ → <20ms
--
-- Monitor with:
--   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
--   FROM pg_stat_user_indexes
--   WHERE indexname LIKE 'idx_%org%';
--
-- FUTURE OPTIMIZATION (if overlap queries show seq scans):
-- If EXPLAIN shows slow overlap queries (check_in < X AND check_out > Y),
-- consider upgrading to GiST indexes with daterange:
--
--   CREATE INDEX idx_reservations_org_daterange
--   ON reservations USING GIST (organization_id, daterange(check_in, check_out))
--   WHERE status IN ('pending', 'confirmed', 'checked_in');
--
-- GiST indexes are specifically optimized for overlap operators (&& in tsrange/daterange)
-- and may outperform btree composites for high-selectivity date range queries.
-- Only implement if pg_stat_statements shows mean_exec_time > 50ms for overlap queries.
