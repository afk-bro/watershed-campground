# E2E Test Suite

This directory contains end-to-end tests for The Watershed Campground application using Playwright.

## Test Coverage

### Guest Booking Flow (`guest-booking-complete.spec.ts`)
**Purpose:** Tests the complete guest booking journey - the critical revenue-generating path.

**Tests:**
1. **Complete Happy Path** - Full booking flow from availability check through Stripe payment to confirmation
   - Selects dates via calendar
   - Chooses campsite parameters (RV, guests, length)
   - Fills personal information
   - Completes Stripe test payment (uses card 4242 4242 4242 4242)
   - Verifies confirmation page with correct details

2. **Validation Handling** - Ensures form validation works correctly
   - Tests required field validation
   - Verifies error messages appear
   - Confirms form doesn't advance with missing data

3. **Date Changes** - Tests ability to go back and change selections
   - Verifies "Change" button returns to wizard
   - Ensures state persistence

**Why This Matters:** Any regression in this flow directly impacts revenue. These tests protect the business.

---

### Admin Reservation Management (`admin/reservation-management.spec.ts`)
**Purpose:** Tests admin workflows for managing reservations throughout their lifecycle.

**Tests:**
1. **Assign Campsite** - Assigns a campsite to pending reservation
   - Opens assignment dialog
   - Selects available campsite
   - Verifies UI and database state update

2. **Check-In** - Checks in a confirmed reservation
   - Changes status to checked_in
   - Verifies both UI and DB

3. **Cancel Reservation** - Cancels an active reservation
   - Updates status to cancelled
   - Confirms state consistency

4. **Full Lifecycle** - Complete flow: pending → assign → check-in → check-out
   - Tests entire reservation lifecycle
   - Ensures all state transitions work correctly

**Test Data:** Creates and cleans up test reservations automatically using `beforeAll`/`afterAll` hooks.

---

### Admin Calendar Interactions (`admin/calendar-interactions.spec.ts`)
**Purpose:** Tests drag-and-drop calendar functionality for visual reservation management.

**Tests:**
1. **Drag to Different Campsite** - Moves reservation between campsites
   - Uses Playwright drag-and-drop
   - Verifies campsite_id updates in database

2. **Extend Reservation** - Drags right edge to extend stay
   - Tests resize functionality
   - Confirms check-out date extends

3. **Shorten Reservation** - Drags left edge forward
   - Tests shortening from check-in side
   - Verifies check-in date moves forward

4. **Conflict Prevention** - Attempts to create overlapping reservation
   - Creates conflicting reservation
   - Tries to drag onto conflict
   - Verifies snap-back or error message
   - Ensures no DB corruption

5. **Move on Same Campsite** - Horizontal drag to different dates
   - Same campsite, different dates
   - Verifies date updates without campsite change

**Why This Matters:** Calendar conflicts can cause double-bookings. These tests prevent critical business errors.

---

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/guest-booking-complete.spec.ts
npx playwright test tests/admin/reservation-management.spec.ts
npx playwright test tests/admin/calendar-interactions.spec.ts
```

### Run with UI (Headed Mode)
```bash
npx playwright test --headed
```

### Run with Debug Mode
```bash
npx playwright test --debug
```

### Run Single Test
```bash
npx playwright test -g "should complete full booking with Stripe payment"
```

### View Test Report
```bash
npx playwright show-report
```

## Prerequisites

### 1. Environment Setup
Tests require `.env.test` file with local Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=testpass123
```

### 2. Local Supabase Running
```bash
supabase start
```

### 3. Dev Server (Auto-Started by Playwright)
The Playwright config automatically starts the dev server via `webServer` configuration.

## Test Architecture

### Authentication Pattern
- **Setup Project:** `auth.setup.ts` runs once before all tests
  - Logs in as admin
  - Saves auth state to `tests/.auth/admin.json`
- **Test Projects:** Authenticated tests reuse saved state
  - No need to log in for every test
  - Faster execution
  - More stable

### Test Helpers
- **`helpers/test-supabase.ts`**: Supabase admin client for tests
  - Bypasses Row Level Security (RLS)
  - Creates/cleans test data
  - Verifies database state

### Data Management
- Tests use `beforeAll`/`afterAll` hooks for setup/cleanup
- Each test suite creates its own test reservations
- Automatic cleanup prevents test data pollution

## Best Practices

### 1. Use Stable Selectors
- **Prefer:** `data-testid` attributes
- **Good:** `getByRole`, `getByText` with specific text
- **Avoid:** CSS class selectors (they change with styling)

### 2. Verify Both UI and Database
```typescript
// Verify UI updated
await expect(reservationRow.getByText('confirmed')).toBeVisible();

// Verify DB state matches
const { data } = await supabaseAdmin
    .from('reservations')
    .select('status')
    .eq('id', testReservationId)
    .single();
expect(data?.status).toBe('confirmed');
```

### 3. Wait for Async Operations
```typescript
// Good - explicit wait
await expect(element).toBeVisible({ timeout: 10000 });

// Good - wait for network
await page.waitForResponse(resp => resp.url().includes('/api/admin'));

// Avoid - arbitrary timeouts (use as last resort)
await page.waitForTimeout(500);
```

### 4. Clean Up Test Data
Always clean up in `afterAll` to prevent test pollution:
```typescript
test.afterAll(async () => {
    if (testReservationId) {
        await supabaseAdmin
            .from('reservations')
            .delete()
            .eq('id', testReservationId);
    }
});
```

## Stripe Testing

Guest booking tests use Stripe test mode with test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Authentication Required:** 4000 0025 0000 3155

See [Stripe Testing Docs](https://stripe.com/docs/testing) for more test cards.

## Troubleshooting

### Tests Fail with "Cannot find module 'server-only'"
- This is expected in test context
- Admin tests use `tests/helpers/test-supabase.ts` instead of `lib/supabase-admin.ts`
- The helper provides same functionality without 'server-only' restriction

### Stripe Elements Not Loading
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in environment
- Verify dev server is running
- Check browser console for Stripe errors

### Calendar Tests Fail
- Ensure local Supabase is running: `supabase start`
- Verify at least 2 active campsites exist in database
- Check `tests/.auth/admin.json` exists (run auth.setup.ts first)

### Database State Errors
- Reset local database: `supabase db reset`
- Run migrations: Check `supabase/migrations/`
- Verify test data cleanup in `afterAll` hooks

## CI/CD Integration

When running in CI:
- Set `CI=true` environment variable
- Playwright config uses `workers: 1` and `retries: 2` in CI mode
- Tests run in headless mode by default
- Screenshots captured on failure for debugging

## Contributing

When adding new tests:
1. Follow existing patterns (happy path, error handling, edge cases)
2. Use meaningful test descriptions
3. Add comments explaining complex interactions
4. Clean up test data in `afterAll`
5. Verify both UI and database state
6. Include in this README under appropriate section
