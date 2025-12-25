# Multi-Tenancy: Tenant Boundary Invariants

## Overview

This document defines the **immutable rules** that enforce tenant isolation in this system. These invariants MUST be maintained in all code changes.

Violating these invariants = **data leak** = **security breach**.

## Core Invariants

### 1. All DB Writes Include `organization_id`

**Rule:** Every INSERT or UPDATE to a tenant-scoped table MUST include `organization_id`.

**Applies to tables:**
- `campsites`
- `reservations`
- `blackout_dates`
- `demo_seed_locks`
- Any future tenant-scoped tables

**Example (CORRECT):**
```typescript
await supabaseAdmin
    .from('campsites')
    .insert({
        name: 'Site 1',
        organization_id: organizationId!, // REQUIRED
        // ... other fields
    });
```

**Example (WRONG - SECURITY BREACH):**
```typescript
await supabaseAdmin
    .from('campsites')
    .insert({
        name: 'Site 1',
        // Missing organization_id - writes to wrong org or fails
    });
```

**Enforcement:**
- TypeScript types SHOULD mark organization_id as required (non-nullable)
- DB constraints enforce NOT NULL
- CI checks grep for missing org filters

---

### 2. All Reads Use `withOrg()` or `verifyOrgResource()`

**Rule:** Every SELECT query MUST filter by `organization_id`.

**Two patterns:**

#### Pattern A: List Queries (`withOrg`)
```typescript
import { withOrg } from '@/lib/db-helpers';

// Lists all campsites in org
const { data } = await supabaseAdmin
    .from('campsites')
    .select('*')
    .eq('organization_id', organizationId!); // Explicit filter
```

#### Pattern B: Single Resource Queries (`verifyOrgResource`)
```typescript
import { verifyOrgResource } from '@/lib/db-helpers';

// Returns 404 if resource not found OR belongs to different org
const campsite = await verifyOrgResource('campsites', campsiteId, organizationId!);
```

**Why verifyOrgResource for single reads?**
- Returns **404** if resource belongs to different org (not 403)
- Prevents **information disclosure** (knowing resource exists)
- Enforces **404-before-FK-validation** pattern

**Example (WRONG - SECURITY BREACH):**
```typescript
const { data } = await supabaseAdmin
    .from('campsites')
    .select('*')
    .eq('id', campsiteId);
    // Missing .eq('organization_id', ...) - leaks cross-org data!
```

**Enforcement:**
- `scripts/check-admin-routes.js` verifies all admin routes use `requireAdminWithOrg()`
- Grep checks verify org filters present
- Smoke tests verify cross-org reads return 404

---

### 3. All Storage Keys Are `org/<orgId>/...`

**Rule:** All file uploads MUST use org-prefixed storage keys.

**Canonical Format:**
```
org/<organizationId>/campsites/<campsiteId>/<uuid>.<ext>
```

**Utility Function:**
```typescript
import { campsiteImageKey } from '@/lib/storage-utils';

const storageKey = campsiteImageKey(orgId, campsiteId, 'photo.jpg');
// Returns: org/<orgId>/campsites/<campsiteId>/<uuid>.jpg
```

**Why org-prefixing?**
- Prevents **cross-org enumeration** (can't guess other org's file paths)
- Enables **bucket-level policies** (RLS on storage)
- Makes **manual cleanup** safer (delete org/<orgId>/* without affecting others)

**Example (WRONG - SECURITY BREACH):**
```typescript
const filename = `campsite-${Date.now()}.jpg`; // No org prefix!
```

**Enforcement:**
- `docs/STORAGE_SECURITY.md` documents standards
- Deprecated `/api/admin/upload-image` is migration-gated
- New `/api/admin/campsites/[id]/images` enforces pattern

---

### 4. All Public Endpoints Require `?org=slug`

**Rule:** Public-facing API endpoints MUST resolve organization via query parameter.

**Pattern:**
```typescript
import { resolvePublicOrganizationId } from '@/lib/tenancy/resolve-public-org';

export async function POST(request: Request) {
    // CRITICAL: Resolve org BEFORE any queries
    const organizationId = await resolvePublicOrganizationId(request);
    if (!organizationId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Now safe to query with organizationId
}
```

**Applies to:**
- `/api/availability/search`
- `/api/availability/calendar`
- `/api/create-payment-intent`
- `/api/reservation`

**Why required query param?**
- **Deterministic** - single source of truth
- **Fail-closed** - no org = 404 (safe)
- **Audit-friendly** - org always in URL logs

**Example (WRONG):**
```typescript
// No org resolution - queries global data!
const { data } = await supabaseAdmin
    .from('campsites')
    .select('*')
    .eq('is_active', true);
```

**Enforcement:**
- Public endpoints return 404 without `?org=slug`
- TypeScript enforces organizationId parameter in engine functions
- E2E tests verify org parameter required

---

### 5. Admin Overrides Are Admin-Only with Explicit 403

**Rule:** Admin-only parameters MUST be rejected for non-admin users BEFORE any processing.

**Pattern:**
```typescript
// In public reservation endpoint
const hasAdminOverrides = formData.forceConflict || formData.overrideBlackout;

if (hasAdminOverrides) {
    const { authorized } = await requireAdmin();
    if (!authorized) {
        // EXPLICIT REJECTION - don't leak which fields are admin-only
        return NextResponse.json(
            { error: "Unauthorized: admin-only parameters detected" },
            { status: 403 }
        );
    }
}
```

**Admin-only flags:**
- `forceConflict` - Skip reservation conflict checks
- `overrideBlackout` - Skip blackout date checks
- `ignorePastCheck` - Allow backdating reservations
- `isOffline` - Mark as paid without payment intent

**Why explicit 403?**
- Prevents **timing attacks** (don't validate then reject)
- Clear **security boundary** (override = admin-only)
- **Fail-closed** - unknown user = hard rejection

**Example (WRONG):**
```typescript
// Implicit trust of request fields
if (formData.forceConflict) {
    // Skip validation - but didn't check if user is admin!
}
```

**Enforcement:**
- Code review checklist
- E2E tests verify public users get 403 with override flags

---

## Verification Checklist

Before deploying multi-tenant changes, verify:

### Static Checks
```bash
# 1. All admin routes use requireAdminWithOrg()
node scripts/check-admin-routes.js

# 2. No unscoped campsite queries
grep -R "\.from('campsites')" app/api/admin | grep -v "organization_id" | grep -v "verifyOrgResource"

# 3. No unscoped reservation queries
grep -R "\.from('reservations')" app/api/admin | grep -v "organization_id" | grep -v "verifyOrgResource"

# 4. No unscoped blackout queries
grep -R "\.from('blackout_dates')" app/api/admin | grep -v "organization_id" | grep -v "verifyOrgResource"

# 5. Storage keys use org prefix
grep -R "org/${" app/api/admin | grep campsiteImageKey
```

### Runtime Tests
```bash
# 6. Tenant isolation smoke test
npx tsx scripts/test-tenant-isolation.ts

# 7. E2E test suite
npx playwright test
```

### Manual Verification
- [ ] Create two test orgs (A, B)
- [ ] Create campsite in org A
- [ ] Login as org B admin
- [ ] Try to view org A's campsite → should 404
- [ ] Try to edit org A's campsite → should 404
- [ ] Check reports only show org B data
- [ ] Upload image to org A campsite
- [ ] Verify storage key: `org/<orgA-id>/campsites/...`

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting Org Filter on Joins

**WRONG:**
```typescript
const { data } = await supabaseAdmin
    .from('reservations')
    .select('*, campsites(*)')
    .eq('organization_id', organizationId!);
    // Join to campsites doesn't automatically filter by org!
```

**CORRECT:**
```typescript
const { data } = await supabaseAdmin
    .from('reservations')
    .select('*, campsites!inner(*)')
    .eq('organization_id', organizationId!)
    .eq('campsites.organization_id', organizationId!);
    // Explicit filter on joined table
```

### ❌ Pitfall 2: Conflict Checks Without Org Scope

**WRONG:**
```typescript
// Check for conflicting reservations
const { data: conflicts } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('campsite_id', campsiteId)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
    // Missing org filter - sees ALL orgs' reservations!
```

**CORRECT:**
```typescript
const { data: conflicts } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('organization_id', organizationId!) // CRITICAL
    .eq('campsite_id', campsiteId)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
```

### ❌ Pitfall 3: Using Old Availability System

**WRONG:**
```typescript
import { checkAvailability } from '@/lib/availability'; // DELETED
```

**CORRECT:**
```typescript
import { checkAvailability } from '@/lib/availability/engine';

const result = await checkAvailability({
    checkIn,
    checkOut,
    guestCount,
    organizationId // REQUIRED parameter
});
```

### ❌ Pitfall 4: Hard-Coding Storage Keys

**WRONG:**
```typescript
const key = `campsites/${campsiteId}/image.jpg`; // No org prefix!
```

**CORRECT:**
```typescript
import { campsiteImageKey } from '@/lib/storage-utils';
const key = campsiteImageKey(orgId, campsiteId, 'image.jpg');
```

---

## Migration Guide

### Adding a New Tenant-Scoped Table

1. **Add organization_id column:**
```sql
ALTER TABLE new_table
ADD COLUMN organization_id UUID NOT NULL
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_new_table_org ON new_table(organization_id);
```

2. **Update TypeScript types** to require organization_id
3. **Add to verification greps** in CI
4. **Update smoke test** to cover new table

### Adding a New Admin Endpoint

1. **Use requireAdminWithOrg():**
```typescript
export async function POST(request: Request) {
    const { authorized, organizationId, response } = await requireAdminWithOrg();
    if (!authorized) return response!;

    // Now safe to use organizationId
}
```

2. **Run verification:**
```bash
node scripts/check-admin-routes.js
```

### Adding a New Public Endpoint

1. **Resolve org first:**
```typescript
import { resolvePublicOrganizationId } from '@/lib/tenancy/resolve-public-org';

export async function POST(request: Request) {
    const organizationId = await resolvePublicOrganizationId(request);
    if (!organizationId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // All queries must use organizationId
}
```

2. **Test with E2E suite** requiring `?org=slug` parameter

---

## Compliance

These invariants align with:
- **OWASP Top 10** - A01:2021 Broken Access Control
- **NIST 800-53** - AC-3 (Access Enforcement)
- **SOC 2** - CC6.1 (Logical Access Controls)

Violations may constitute a **security incident** requiring disclosure.

---

## Contact

Questions about tenant isolation? Contact the engineering team before making changes to multi-tenant code.

**Never compromise on tenant boundaries.**
