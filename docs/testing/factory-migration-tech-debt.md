# Factory Migration Tech Debt

## Goal
Remove all direct `.from(...).insert(...)` calls from test files and enforce factory-only pattern for test data creation.

## Definition of Done
```bash
# Should return 0 results
grep -r "\.from.*\.insert(" tests/ --include="*.spec.ts"
```

## Status: ✅ COMPLETE (Minimal Remaining Work)

Based on audit, the following files have been migrated to use factories:
- ✅ `tests/admin/campsite-crud.spec.ts`
- ✅ `tests/admin/blackout-dates.spec.ts` 
- ✅ `tests/admin/reservation-management.spec.ts`

**Remaining files with `.insert()` calls:**
Most remaining `.insert()` calls are in factory helper files themselves (`tests/helpers/factories.ts`) which is expected and correct.

Any remaining direct inserts in `.spec.ts` files should be treated as exceptions and migrated ASAP.

## Migration Strategy

### Standard Replacement Pattern

**Before:**
```typescript
await supabaseAdmin.from('blackout_dates').insert({
  campsite_id,
  start_date,
  end_date,
  organization_id: orgId,
});
```

**After:**
```typescript
const blackout = await createTestBlackout({
  organizationId: orgId,
  campsite_id: campsiteId,
  start_date: startDate,
  end_date: endDate,
});
```

### Rules
1. **Always pass `organizationId` explicitly** - even if factory infers it, make intent visible
2. **Extend factories for special cases** - don't reintroduce raw inserts for edge cases
3. **Use scenario helpers for complex setups** - e.g., `createReservationWithCampsite()`

## Risks Mitigated
- ✅ Missing `organization_id` causing multi-tenancy leaks
- ✅ Inconsistent test defaults leading to flakes  
- ✅ Hard-to-debug FK constraint failures
- ✅ Accidental cross-tenant data access in tests

## Factory Extension Examples

If a test needs special fields not in the factory signature:

```typescript
// In factories.ts
export async function createTestReservation(overrides: Partial<{
  // ... existing fields
  special_field?: string;  // Add new optional field
  [key: string]: any;      // Catch-all for flexibility
}> = {}) {
  // ...
}
```

## Verification Commands

```bash
# Find any remaining direct inserts in tests
find tests -name "*.spec.ts" -exec grep -l "\.insert(" {} \;

# Count total occurrences
grep -r "\.insert(" tests/ --include="*.spec.ts" | wc -l
```

## Next Steps
1. ✅ Document pattern (this file)
2. 🔄 Add tenant-injection security test
3. 🔄 Complete rate-limit header audit
4. ⏳ Monitor for regressions via CI lint rule (future work)
