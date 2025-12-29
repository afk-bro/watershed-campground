# E2E Test Setup Guide

## Prerequisites Checklist

Before running E2E tests, ensure all prerequisites are met:

### ✅ 1. Hosted Supabase Credentials

This project uses a hosted Supabase instance for CI and for developer testing against a shared test project. To run tests locally against hosted Supabase, create a `.env.test` with the hosted project's credentials (stored in your org's secrets or provided by the team).

Example `.env.test` (replace values with your hosted test project credentials):
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=testpass123
```

Optional workflows:
- Use a dedicated hosted test project (recommended) and keep credentials in your password manager or environment.
- Use an ephemeral Postgres service for isolated DB-backed tests (see CI alternatives below).

---

## Running Tests

### Quick Verification
```bash
# List all tests (no execution)
npx playwright test --list

# Should show 24 tests including new ones
```

### Run New Tests Step-by-Step

#### 1. Guest Booking Flow (Visual/Headed Mode)
```bash
npx playwright test tests/guest-booking-complete.spec.ts --headed
```

**What to watch:**
- Browser opens automatically
- Navigates through booking wizard
- Fills Stripe test card
- Shows confirmation page

**Expected:** All 3 tests pass ✅

---

#### 2. Admin Reservation Management
```bash
npx playwright test tests/admin/reservation-management.spec.ts --headed
```

**What to watch:**
- Logs into admin panel
- Assigns campsite to reservation
- Changes status through lifecycle
- Verifies database matches UI

**Expected:** All 4 tests pass ✅

---

#### 3. Calendar Interactions
```bash
npx playwright test tests/admin/calendar-interactions.spec.ts --headed
```

**What to watch:**
- Drags reservation blocks
- Resizes reservations
- Tests conflict prevention

**Expected:** All 5 tests pass ✅

---

### Run All New Tests Together
```bash
# Headless mode (faster)
npx playwright test tests/guest-booking-complete.spec.ts tests/admin/reservation-management.spec.ts tests/admin/calendar-interactions.spec.ts

# With UI
npx playwright test tests/guest-booking-complete.spec.ts tests/admin/reservation-management.spec.ts tests/admin/calendar-interactions.spec.ts --headed
```

---

## Troubleshooting

### Issue: "Missing Supabase credentials"
**Solution:** Ensure `.env.test` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your hosted test project or CI secrets.

### Issue: "Test fails with 'admin@test.com not found'"
**Solution:** If you control the hosted test project, apply migrations and (optionally) run `supabase db reset` from a machine that has CLI access and is intended for administering that project. Otherwise ask the team to apply migrations and seed data to the shared test project.

### CI alternatives (if you want isolated DBs for CI)
- Use GitHub Actions `services: postgres` and run migrations inside the job (fast, isolated).
- Use hosted Supabase test project and rely on credentials in repository secrets (recommended for parity with production features like Auth and Storage).
### Issue: "Stripe Elements not loading"
**Solution:** Check `.env.local` has:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Issue: "Timeout waiting for dev server"
**Solution:** The dev server auto-starts, but if it fails:
1. Kill any existing dev servers: `pkill -f "next dev"`
2. Start manually: `npm run dev`
3. Run tests: `npx playwright test`

---

## Verification Checklist

Before considering tests complete:

- [ ] Docker Desktop is running
- [ ] `npx supabase status` shows all services running
- [ ] `.env.test` has correct local Supabase credentials
- [ ] `npx playwright test --list` shows 24 tests
- [ ] Guest booking test passes (3/3)
- [ ] Admin reservation test passes (4/4)
- [ ] Calendar interaction test passes (5/5)
- [ ] Test report generated: `npx playwright show-report`

---

## Next Steps After Verification

Once all tests pass:
1. Commit the new test files
2. Update CLAUDE.md with test running instructions
3. Move to Priority #2: Distributed Rate Limiting
4. Move to Priority #3: CI/CD Pipeline (which will run these tests automatically)

---

## Quick Reference

```bash
# Full test cycle
npx playwright test --list                  # Verify tests load (uses hosted `.env.test`)
npx playwright test --headed                # Run all with UI (uses hosted `.env.test`)
npx playwright show-report                  # View results

# Individual test suites
npx playwright test tests/guest-booking-complete.spec.ts
npx playwright test tests/admin/reservation-management.spec.ts
npx playwright test tests/admin/calendar-interactions.spec.ts

# Debug a failing test
npx playwright test --debug
npx playwright test -g "should complete full booking" --debug

# Clean up
# If you started a local Supabase instance manually, stop it. Otherwise nothing to do.
# npx supabase stop
```
