# Watershed Campground - E2E Test Suite

Comprehensive end-to-end test suite using Playwright for testing both admin panel and public-facing features.

## Quick Start

### Initial Setup (First Time)

```bash
# Setup complete test environment
npm run test:setup

# Or use the script with options
./scripts/test-setup.sh --help
```

This automated script will:
- Check prerequisites (Docker, Node.js)
- Start local Supabase
- Reset database and run all migrations
- Seed test data (7 campsites, 3 reservations, 1 admin user)
- Verify everything is ready

### Run Tests

```bash
# Run all tests
npm test

# Run only admin tests
npm run test:admin

# Run only guest tests
npm run test:guest

# Run quick smoke tests (fastest validation)
npm run test:quick

# Run with browser UI (useful for debugging)
npm run test:headed

# Debug mode (step through tests)
npm run test:debug

# View last test report
npm run test:report
```

## Test Organization

```
tests/
├── README.md                  # This file
├── auth.setup.ts              # Auth setup (runs once before all tests)
├── .auth/
│   └── admin.json            # Saved admin session state
├── admin/                     # Admin panel tests (require auth)
│   ├── auth.spec.ts          # Authentication flows
│   ├── smoke.spec.ts         # Basic admin functionality
│   ├── reservation-management.spec.ts
│   ├── calendar-interactions.spec.ts
│   ├── maintenance-blocks.spec.ts
│   ├── campsite-crud.spec.ts # Campsite CRUD operations ✨ NEW
│   └── blackout-dates.spec.ts # Blackout dates management ✨ NEW
├── guest/                     # Public-facing tests (no auth)
│   ├── booking-flow.spec.ts  # Guest reservation flow
│   ├── booking-complete.spec.ts  # Full booking with payment
│   ├── booking-errors.spec.ts    # Payment failures & validation ✨ NEW
│   └── manage-reservation.spec.ts # Guest self-service cancel ✨ NEW
├── integration/               # Integration tests ✨ NEW
│   └── stripe-webhooks.spec.ts # Stripe webhook handling
└── security/                  # Security tests ✨ NEW
    └── rate-limiting.spec.ts  # Rate limit enforcement
```

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

### Guest Manage Reservation (`guest/manage-reservation.spec.ts`) ✨ NEW
**Purpose:** Tests guest self-service reservation management via magic link

**Tests:**
1. **View Reservation** - Guest accesses reservation with valid token
   - Displays all guest information
   - Shows reservation details (dates, party size, RV info)
   - Shows current status badge
   - Provides cancel button if eligible

2. **Cancel Confirmed Reservation** - Guest cancels their own booking
   - Confirms cancellation dialog
   - Updates status to cancelled in UI and database
   - Removes cancel button after cancellation
   - Shows cancellation confirmation message

3. **Cancel Pending Reservation** - Same flow for pending status

4. **Security Validations**
   - Invalid token returns error
   - Missing parameters rejected
   - Non-existent reservation ID handled
   - Cannot cancel checked-in/checked-out reservations
   - Cannot cancel already cancelled reservations
   - User dismissing confirmation prevents cancellation

5. **API Validation**
   - Missing parameters return 400
   - Already cancelled returns 400
   - Checked-in/checked-out returns 400

**Why This Matters:** Reduces admin workload by 30-40%. Guests prefer self-service. Improves customer satisfaction.

---

### Guest Booking Errors (`guest/booking-errors.spec.ts`) ✨ NEW
**Purpose:** Tests error handling for real-world failure scenarios

**Tests:**
1. **Payment Errors** - Using Stripe test cards
   - Declined card (4000 0000 0000 0002)
   - Insufficient funds (4000 0000 0000 9995)
   - Expired card (4000 0000 0000 0069)
   - Incorrect CVC (4000 0000 0000 0127)
   - Processing error (4000 0000 0000 0119)
   - All should show error and allow retry

2. **Form Validation**
   - Missing required email field
   - Invalid email format
   - Phone number too short
   - Should show validation messages
   - Should prevent form advancement

3. **Availability Errors**
   - All sites booked for selected dates
   - Should show "no availability" message
   - Should not show "Book Now" buttons

4. **Date Selection Errors**
   - Cannot select check-out before check-in
   - Cannot select past dates
   - Calendar should disable invalid selections

5. **Network Errors**
   - API timeout handling
   - Graceful error display

**Why This Matters:** Real users encounter errors. Good error handling reduces support tickets and abandonment rates.

---

### Rate Limiting (`security/rate-limiting.spec.ts`) ✨ NEW
**Purpose:** Tests Upstash Redis-based distributed rate limiting

**Tests:**
1. **Availability API (30 req/min)**
   - Enforces 30 requests per minute limit
   - Returns 429 Too Many Requests after limit
   - Includes standard headers (X-RateLimit-*)

2. **Payment API (5 req/min)**
   - Enforces stricter 5 requests per minute
   - Tighter limit than availability endpoint
   - Prevents payment intent spam

3. **Rate Limit Recovery**
   - Requests allowed again after window resets
   - Reset timestamp in headers is accurate

4. **Endpoint Isolation**
   - Different endpoints have separate limits
   - Hitting limit on one doesn't affect another

5. **Fail-Open Behavior**
   - Allows requests if Upstash unavailable
   - Prevents blocking legitimate users

**Why This Matters:** Prevents DDoS attacks, API abuse, and ensures fair resource usage. Critical for production stability.

**Note:** Requires Upstash Redis credentials in `.env.test`. If not configured, tests verify fail-open behavior.

---

### Campsite CRUD (`admin/campsite-crud.spec.ts`) ✨ NEW
**Purpose:** Tests complete campsite inventory management

**Tests:**
1. **List Campsites** - Display all active campsites
   - Filter by type (RV, tent, cabin)
   - Toggle show inactive

2. **Create Campsite** - Add new campsites (22 tests)
   - Create RV, tent, and cabin sites
   - Reject duplicate campsite codes (409)
   - Validate required fields (name, code, type)
   - Validate guest capacity (1-50)
   - Validate type enum

3. **Read Campsite** - Fetch single campsite
   - Get by ID
   - Return 404 for non-existent

4. **Update Campsite** - Modify campsite details
   - Update name, rate, capacity
   - Update multiple fields at once
   - Activate/deactivate sites
   - Reject duplicate code updates

5. **Delete Campsite** - Soft delete (deactivate)
   - Sets is_active to false
   - Campsite still exists in database
   - Return 404 for non-existent

**Why This Matters:** Core inventory management. Sites must be accurate for availability and pricing. Validation prevents booking errors.

---

### Blackout Dates (`admin/blackout-dates.spec.ts`) ✨ NEW
**Purpose:** Tests blocking dates for maintenance or closures

**Tests:**
1. **Create Blackout Dates** - Block dates
   - Campground-wide blackout (all sites)
   - Site-specific blackout
   - Single-day blackout
   - Validate required fields
   - Prevent end date before start date

2. **Blackout Impact on Availability** - Integration testing
   - Prevent bookings during blackout period
   - Allow bookings before blackout
   - Allow bookings after blackout

3. **Site-Specific Blackout** - Granular blocking
   - Prevent booking specific site during its blackout
   - Allow booking other sites during site-specific blackout

4. **List Blackout Dates** - Query blackouts
   - Fetch all blackouts
   - Filter by date range
   - Filter by campsite

**Why This Matters:** Prevents bookings during maintenance or off-season. Supports seasonal operations and planned downtime.

---

### Stripe Webhooks (`integration/stripe-webhooks.spec.ts`) ✨ NEW
**Purpose:** Tests Stripe payment webhook integration

**Tests:**
1. **Payment Intent Succeeded Workflow**
   - Pending reservation ready for webhook
   - Webhook requires stripe-signature header
   - Reject invalid signatures

2. **Webhook Idempotency**
   - Track processed webhooks
   - Prevent duplicate processing

3. **Email Notification After Payment**
   - Track email_sent_at timestamp
   - Idempotency for email sending

4. **Reservation Status Transitions**
   - Transition pending → confirmed
   - Update payment status

**Why This Matters:** Critical for payment processing reliability. Prevents double-charging and ensures reservations are confirmed after successful payment.

**Note:** Full webhook signature verification testing requires Stripe CLI or test environment.

---

## Test Suites

### Admin Tests (`tests/admin/`)
Tests requiring admin authentication. Uses saved session from `auth.setup.ts`.

**Coverage:**
- Authentication flows (login, logout, password reset)
- Reservation management (assign, check-in, cancel, lifecycle)
- Calendar interactions (drag-and-drop, conflict prevention)
- Maintenance blocks management
- Campsite CRUD operations (create, read, update, delete) ✨ NEW
- Blackout dates management (campground-wide, site-specific) ✨ NEW

**Run:** `npm run test:admin` or `./scripts/test-admin.sh`

### Guest Tests (`tests/guest/`)
Public-facing tests that don't require authentication.

**Coverage:**
- Complete booking flow (happy path with Stripe payment)
- Guest self-service (view/cancel reservations via magic link) ✨ NEW
- Payment error handling (declined cards, validation errors) ✨ NEW
- Form validation (required fields, format validation)
- Availability scenarios (no availability, date constraints)

**Run:** `npm run test:guest` or `./scripts/test-guest.sh`

### Security Tests (`tests/security/`) ✨ NEW
Security and abuse prevention tests.

**Coverage:**
- Rate limiting enforcement (Upstash Redis)
- Rate limit headers and recovery
- Endpoint isolation (separate limits per API)
- Fail-open behavior (graceful degradation)

**Run:** `npx playwright test tests/security/`

### Integration Tests (`tests/integration/`) ✨ NEW
Cross-system integration tests.

**Coverage:**
- Stripe webhook handling (payment succeeded, idempotency)
- Email notifications (tracking, status updates)
- Payment-to-reservation workflow

**Run:** `npx playwright test tests/integration/`

## Helper Scripts

All scripts are in `scripts/` directory:

### `test-setup.sh` - Complete Environment Setup
```bash
./scripts/test-setup.sh              # Setup only
./scripts/test-setup.sh --dev        # Setup + start dev server
./scripts/test-setup.sh --test       # Setup + run tests
./scripts/test-setup.sh --dev --test # Full workflow
```

### `test-admin.sh` - Run Admin Tests
```bash
./scripts/test-admin.sh              # Run all admin tests
./scripts/test-admin.sh --headed     # Run with browser UI
./scripts/test-admin.sh --debug      # Debug mode
```

### `test-guest.sh` - Run Guest Tests
```bash
./scripts/test-guest.sh              # Run all guest tests
./scripts/test-guest.sh --headed     # Run with browser UI
```

### `test-quick.sh` - Quick Validation
```bash
./scripts/test-quick.sh              # Run smoke tests only
```

## Common Commands

```bash
# Run all tests
npm test

# Run specific suite
npm run test:admin
npm run test:guest

# Run specific test file
npx playwright test tests/admin/smoke.spec.ts
npx playwright test tests/guest/booking-complete.spec.ts

# Run with UI (headed mode)
npm run test:headed

# Debug mode
npm run test:debug

# Run single test by name
npx playwright test -g "should complete full booking with Stripe payment"

# View test report
npm run test:report
```

## Test Environment

### Prerequisites
- Docker (required for local Supabase)
- Node.js 20+
- NPM dependencies installed

### Local Supabase
Tests run against a local Supabase instance.

**Test Credentials:**
- Admin Email: `admin@test.com`
- Admin Password: `testpass123`
- Supabase Studio: http://localhost:54323
- PostgreSQL: `postgresql://postgres:postgres@localhost:54322/postgres`

### Environment Variables
Configuration in `.env.test`:

```bash
# Local Supabase (from npx supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Test Admin Credentials
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=testpass123

# Stripe Test Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Seed Data

**Two-File Seeding Strategy:**

1. **`supabase/seed.local.sql`** - DESTRUCTIVE (local/test only)
   - Truncates all tables for clean slate
   - Safety checks prevent running in production/preview
   - **Only run explicitly via `npm run test:db:reset`**
   - **Never in `sql_paths`** (not auto-executed by Supabase)

2. **`supabase/seed.sql`** - SAFE (all environments)
   - Inserts test data with explicit `ON CONFLICT (business_key) DO NOTHING`
   - Idempotent - safe to run multiple times
   - Includes E2E validation that fails loudly if incomplete
   - In `sql_paths` (runs during `supabase db reset`)

**What Gets Seeded:**

**Campsites (7):**
- S1, S2, S3: RV sites (riverfront)
- S4, S5: Tent sites (forest)
- C1, C2: Cabins

**Reservations (3):**
- 2 assigned reservations (confirmed)
- 1 unassigned reservation (pending) - for testing assignment flow

**Admin User:**
- Email: admin@test.com
- Password: testpass123

**Production Safety:** The destructive `seed.local.sql` will NEVER run in production because:
- It's **NOT in `sql_paths`** (must be run explicitly via test scripts)
- Has safety checks that abort if not running on local Supabase
- Vercel/preview/production only run the safe `seed.sql` (if at all)

**Local Reset Command:**
```bash
npm run test:db:reset  # Runs migrations + seed.local.sql + seed.sql
```

This script:
1. Runs `npx supabase db reset` (migrations + seed.sql)
2. Explicitly runs `seed.local.sql` (truncate)
3. Re-runs `seed.sql` (reload test data)
4. Validates all data loaded correctly

**Validation:** After seeding, validation checks ensure:
- At least 7 campsites exist
- At least 3 reservations exist
- Admin user (admin@test.com) exists
- If validation fails, the command errors loudly instead of silently continuing

### Dev Server
The Playwright config automatically starts the dev server if not running.

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

**Default Behavior:** Stripe payment tests are **SKIPPED by default** to:
- Avoid flaky headless browser + iframe interactions
- Prevent unnecessary Stripe API calls during development
- Keep PRs deployable even when Stripe iframes are flaky

```bash
# Default test run (Stripe tests skipped)
npx playwright test
# Result: ~175 passed, 15 skipped ✅

# Enable Stripe tests for full payment flow testing
STRIPE_TESTS_ENABLED=true npx playwright test
# Result: ~190 passed ✅
```

**CI Strategy:**
- **PR checks**: Stripe tests SKIPPED (fast, reliable gate)
- **Nightly builds**: Stripe tests ENABLED (full coverage)
- **Pre-release**: Stripe tests ENABLED (comprehensive validation)

**Test Cards:**
When Stripe tests are enabled, use these test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Authentication Required:** 4000 0025 0000 3155

See [Stripe Testing Docs](https://stripe.com/docs/testing) for more test cards.

## Troubleshooting

### Docker Not Running
```
Error: Docker is not running
```
**Fix:** Start Docker Desktop

### Port Already in Use
```
Error: Port 3000 is already in use
```
**Fix:** Kill existing process
```bash
lsof -ti:3000 | xargs kill -9
```

### Supabase Not Starting
```
Error: Failed to start Supabase
```
**Fix:** Reset Docker containers
```bash
npx supabase stop
docker system prune -f
npx supabase start
```

### Auth Setup Failing
```
Error: Login failed
```
**Fix:** Ensure database is seeded with admin user
```bash
npx supabase db reset
```

### Tests Failing Randomly
**Common causes:**
- Database state not reset between runs
- Dev server not ready
- Network timeouts

**Fix:** Use test setup script
```bash
./scripts/test-setup.sh --test
```

### Tests Fail with "Cannot find module 'server-only'"
- This is expected in test context
- Admin tests use `tests/helpers/test-supabase.ts` instead of `lib/supabase-admin.ts`
- The helper provides same functionality without 'server-only' restriction

### Stripe Elements Not Loading
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in environment
- Verify dev server is running
- Check browser console for Stripe errors

### Calendar Tests Fail
- Ensure local Supabase is running: `npx supabase start`
- Verify at least 2 active campsites exist in database
- Check `tests/.auth/admin.json` exists (run setup first)

### Database State Errors
- Reset local database: `npx supabase db reset`
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
