# Testing Guide

## Overview

This project uses Playwright for E2E testing with a **hosted Supabase test database**. Tests run against real database and API endpoints to ensure production-like behavior.

## Test Infrastructure

### Hosted Supabase Usage

**Why Hosted?**
- Consistent environment across local dev and CI
- No Docker overhead or local Supabase setup required
- Faster test startup (no container spin-up)
- Matches production database schema exactly

**Configuration:**
- Test credentials in `.env.test` (committed example, real values in CI secrets)
- Default organization: `watershed-campground` (`00000000-0000-0000-0000-000000000001`)
- Service role key used for admin operations and database reset

### Database Reset Behavior

**Automatic Reset (`tests/db/reset-e2e.ts`):**

Before each test run, the global setup hook automatically:

1. **Clears test data** (org-scoped):
   - `payment_transactions` (all records)
   - `audit_logs` (org-scoped)
   - `blackout_dates` (org-scoped)
   - `reservations` (org-scoped)

2. **Re-seeds 3 test reservations**:
   - 2 confirmed reservations (john.doe@test.com, jane.smith@test.com)
   - 1 pending reservation (bob.johnson@test.com)

3. **Preserves base data**:
   - Organizations
   - Campsites (S1-S5, C1-C2)
   - Users and permissions

**When it runs:**
- Controlled by `E2E_DB_RESET_ENABLED=true` in `.env.test`
- Executes once before all tests via Playwright `globalSetup`
- Uses service role key to bypass RLS policies

### Safety Guards

**Production Protection:**

The reset script includes multiple safety mechanisms:

```typescript
// 1. Explicit opt-in via environment variable
if (process.env.E2E_DB_RESET_ENABLED !== "true") {
    console.log("Skipping DB reset (E2E_DB_RESET_ENABLED != true)");
    return;
}

// 2. URL pattern detection
if (/prod|production/i.test(url)) {
    throw new Error(`Refusing to reset DB: URL looks like prod: ${url}`);
}

// 3. Organization-scoped deletes
// Only deletes data for the test organization, not global wipe
```

**Best Practices:**

- **Never** set `E2E_DB_RESET_ENABLED=true` in production environment
- **Never** point `.env.test` credentials at production database
- **Always** verify `NEXT_PUBLIC_SUPABASE_URL` before running tests
- Test database URL should contain your test project ref, not production

## Running Tests

### Full Suite
```bash
npx playwright test
```

### Specific Test File
```bash
npx playwright test tests/admin/campsite-crud.spec.ts
```

### Single Test
```bash
npx playwright test tests/admin/campsite-crud.spec.ts:341
```

### With UI
```bash
npx playwright test --headed
```

### Debug Mode
```bash
npx playwright test --debug
```

### View Report
```bash
npx playwright show-report
```

## Test Categories

### Admin Tests (`tests/admin/`)
- Require admin authentication (uses saved session from setup)
- Test admin panel features: CRUD operations, calendar, reservations
- Run with `npx playwright test tests/admin/`

### Guest Tests (`tests/guest/`)
- Public-facing features (no auth required)
- Booking flow, availability checks, guest management
- Run with `npx playwright test tests/guest/`

### Integration Tests (`tests/integration/`)
- Database integration, service layer testing
- Run with admin auth context
- Run with `npx playwright test tests/integration/`

### Security Tests (`tests/security/`)
- Rate limiting, auth boundaries, RLS validation
- Run with `npx playwright test tests/security/`

## Multi-Tenancy Testing

All tests operate within the **default test organization** context:

```typescript
const organizationId = '00000000-0000-0000-0000-000000000001';
const orgSlug = 'watershed-campground';
```

**When creating test data:**
```typescript
// ✅ CORRECT - includes organization_id
await supabaseAdmin.from('campsites').insert({
    name: 'Test Site',
    code: 'TS1',
    organization_id: organizationId,
    // ... other fields
});

// ❌ WRONG - missing organization_id (will fail NOT NULL constraint)
await supabaseAdmin.from('campsites').insert({
    name: 'Test Site',
    code: 'TS1',
});
```

## Current Test Status

**Total: 233 tests**
- ✅ 220 passed
- ⏭️ 9 skipped (Stripe payment tests - require `STRIPE_TESTS_ENABLED=true`)
- ⚠️ 4 did not run (conditional/dependency tests)

## Troubleshooting

### Tests Fail with "organization_id violates not-null constraint"
**Solution:** Add `organization_id: organizationId` to your INSERT statement.

### Tests Fail with "Org resolution failed: not found"
**Solution:** Verify `NEXT_PUBLIC_ORG_SLUG=watershed-campground` in `.env.test`.

### Database Reset Not Running
**Solution:** Set `E2E_DB_RESET_ENABLED=true` in `.env.test`.

### Stale Test Data Causing Conflicts
**Solution:** Database reset should handle this automatically. If issues persist, manually clear data or adjust reset script.

### Service Role Key Missing
**Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.test`. This key is required for admin operations and database reset.

## CI/CD Integration

**GitHub Actions** (`.github/workflows/ci.yml`):
- Secrets configured for hosted Supabase test project
- Database reset runs automatically before E2E tests
- Full test suite runs on every PR and push to main/dev

**Environment Variables Required in CI:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TEST_ADMIN_EMAIL
TEST_ADMIN_PASSWORD
E2E_DB_RESET_ENABLED=true
E2E_ORG_SLUG=watershed-campground
```

---

**Last Updated:** 2025-12-29
**Test Suite Version:** e2e-green-multi-tenancy
