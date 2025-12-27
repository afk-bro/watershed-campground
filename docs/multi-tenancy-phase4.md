# Multi-Tenancy Phase 4: Auth Scaffolding Migration

## Status: Auth Migrated, Queries Pending

**Date**: 2024-12-24  
**Phase**: 4 of 5

---

## What's Complete ✅

### 1. Auth Scaffolding (All Endpoints)
All admin endpoints now use `requireAdminWithOrg()`:
- ✅ Reservations (list, CRUD, bulk operations)
- ✅ Campsites (list, CRUD)
- ✅ Blackout dates (list, CRUD)
- ✅ Reports, upload-image
- ✅ Demo seed system

### 2. CI Safety Gate
- ✅ GitHub Actions workflow (`check-admin-routes.yml`)
- ✅ Automated verification script (`scripts/check-admin-routes.js`)
- ✅ Fails build if any unsafe routes found

### 3. Migration Gate
- ✅ Fail-closed in production/preview
- ✅ Allows dev to continue working
- ✅ Consistent error payload

---

## What's Pending ⚠️

### Query Organization Scoping

Each endpoint needs manual review to add `.eq('organization_id', organizationId!)` to:
- All `.from()` queries
- All `.insert()` operations (include `organization_id: organizationId`)
- Foreign key verification queries

**Why Manual?** Each file has unique query patterns, foreign key relationships, and business logic that requires careful review.

---

## Production Safety 🛡️

**The app is safe to deploy** because:
1. Unmigrated endpoints fail closed (501) in prod/preview
2. Dev environment continues working
3. CI prevents adding new unsafe routes
4. Critical path (calendar, reservations list) fully migrated

---

## Next Batches (Priority Order)

### Batch 1: Reservation Mutations (Highest Risk)
- `/api/admin/reservations/[id]/route.ts` (PATCH, DELETE)
- `/api/admin/reservations/[id]/assign/route.ts`
- `/api/admin/reservations/bulk-status/route.ts`
- `/api/admin/reservations/bulk-archive/route.ts`
- `/api/admin/reservations/bulk-assign-random/route.ts`

### Batch 2: Campsite Mutations
- `/api/admin/campsites/route.ts` (POST)
- `/api/admin/campsites/[id]/route.ts` (PATCH, DELETE)
- `/api/admin/campsites/[id]/images/route.ts` ⚠️ Storage paths need org scoping

### Batch 3: Blackout Mutations
- `/api/admin/blackout-dates/route.ts` (POST)
- `/api/admin/blackout-dates/[id]/route.ts` (PATCH, DELETE)

### Batch 4: Reads & Reports
- `/api/admin/campsites/route.ts` (GET)
- `/api/admin/campsites/[id]/route.ts` (GET)
- `/api/admin/blackout-dates/route.ts` (GET)
- `/api/admin/reports/route.ts`
- `/api/admin/upload-image/route.ts`

---

## Mechanical Process (Per Endpoint)

1. **Search for queries**: `grep "\.from(" <file>`
2. **For each query**:
   - If using `supabaseAdmin`: Add `.eq('organization_id', organizationId!)`
   - If inserting: Include `organization_id: organizationId`
3. **Foreign key checks**: Verify referenced resources belong to same org
4. **Return 404** (not 403) for cross-org access attempts
5. **Test**: Verify endpoint works with org scoping

---

## Helper Function (Use This!)

```typescript
// lib/db-helpers.ts
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Helper to ensure all queries are org-scoped.
 * Use this instead of direct supabaseAdmin calls.
 */
export function withOrg(table: string, organizationId: string) {
    return supabaseAdmin
        .from(table)
        .select('*')
        .eq('organization_id', organizationId);
}
```

This prevents missing org filters in complex files.

---

## Verification

After completing each endpoint:
- [ ] All queries include org filter
- [ ] All inserts include org_id
- [ ] Foreign keys verified
- [ ] Cross-org returns 404
- [ ] Test in dev environment

---

## Timeline Estimate

- **Batch 1** (Reservations): 2-3 hours
- **Batch 2** (Campsites): 1-2 hours
- **Batch 3** (Blackouts): 1 hour
- **Batch 4** (Reads): 1 hour

**Total**: 5-7 hours of focused work

---

## References

- **Migration Recipe**: [`migration-recipe.md`](file:///C:/Users/kayla/.gemini/antigravity/brain/faf74e33-3dfe-4fbc-939d-0a6c46bc490d/migration-recipe.md)
- **Database Migration**: `supabase/migrations/20241224_add_multi_tenancy.sql`
- **CI Workflow**: `.github/workflows/check-admin-routes.yml`
