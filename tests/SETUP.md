# E2E Test Setup Guide

## Prerequisites Checklist

Before running E2E tests, ensure all prerequisites are met:

### ✅ 1. Docker Desktop Running
```bash
# Verify Docker is running
docker ps
```

**If not running:**
- Start Docker Desktop
- Enable WSL 2 integration in Docker Desktop settings
- Restart WSL: `wsl --shutdown` then reopen terminal

---

### ✅ 2. Supabase CLI Installed
```bash
# Check if installed
npx supabase --version
```

Should show version like `1.x.x`

---

### ✅ 3. Environment Variables Set
Verify `.env.test` exists and contains:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=testpass123
```

---

### ✅ 4. Start Local Supabase
```bash
npx supabase start
```

**Expected output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: <secret>
        anon key: <anon-key>
service_role key: <service-role-key>
```

**Copy the keys to `.env.test`**

---

### ✅ 5. Verify Database is Seeded
```bash
# Check if admin user exists
npx supabase db dump --data-only | grep admin@test.com
```

If no admin user, seed the database:
```bash
npx supabase db reset
```

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

### Issue: "Cannot connect to Docker daemon"
**Solution:** Start Docker Desktop and enable WSL 2 integration

### Issue: "Supabase not running"
**Solution:**
```bash
npx supabase stop
npx supabase start
```

### Issue: "Test fails with 'admin@test.com not found'"
**Solution:** Reset database to run migrations and seeds:
```bash
npx supabase db reset
```

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
npx supabase start                          # Start local DB
npx playwright test --list                  # Verify tests load
npx playwright test --headed                # Run all with UI
npx playwright show-report                  # View results

# Individual test suites
npx playwright test tests/guest-booking-complete.spec.ts
npx playwright test tests/admin/reservation-management.spec.ts
npx playwright test tests/admin/calendar-interactions.spec.ts

# Debug a failing test
npx playwright test --debug
npx playwright test -g "should complete full booking" --debug

# Clean up
npx supabase stop                           # Stop Supabase
```
