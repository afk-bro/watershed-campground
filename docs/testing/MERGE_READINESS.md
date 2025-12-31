# Merge Readiness Checklist

## Critical: Stability Verification

Run these commands **in order** and document results before merging:

```bash
# 1. Admin suite stability (repeat runs to catch flakes)
npx playwright test --project=admin --repeat-each=3

# 2. Mobile suite sanity check
npx playwright test --project=mobile-chrome --repeat-each=2

# 3. Parallelism stress test
npx playwright test --project=admin --workers=4

# 4. Security: Tenant injection test
npx playwright test tests/security/tenant-injection.spec.ts

# 5. Security: Rate limiting test
npx playwright test tests/security/rate-limiting.spec.ts
```

### If Any Test Flakes

**DO NOT:**
- Paper over with arbitrary `waitForTimeout()` calls
- Increase global timeouts without understanding root cause
- Skip or disable the test

**DO:**
- Tighten locator scoping (use `data-testid` or parent scoping)
- Add `data-testid` to disambiguate UI elements
- Fix app-side race conditions (e.g., missing loading states)
- Use `waitFor` with specific conditions rather than fixed delays

---

## Guardrails: Prevent Regression

### 1. Enforce "No Raw Inserts" in Tests

**Goal:** Prevent `.insert()` calls outside of `tests/helpers/factories.ts`

**Implementation Option A: ESLint Rule (Recommended)**

Add to `.eslintrc.json`:
```json
{
  "overrides": [
    {
      "files": ["tests/**/*.spec.ts"],
      "excludedFiles": ["tests/helpers/factories.ts"],
      "rules": {
        "no-restricted-syntax": [
          "error",
          {
            "selector": "CallExpression[callee.property.name='insert']",
            "message": "Direct .insert() calls are prohibited in test files. Use factories from tests/helpers/factories.ts instead."
          }
        ]
      }
    }
  ]
}
```

**Implementation Option B: Pre-commit Hook**

Add to `.husky/pre-commit` or `package.json` scripts:
```bash
#!/bin/sh
# Check for direct inserts in test files (excluding factories.ts)
if git diff --cached --name-only | grep -E 'tests/.*\.spec\.ts$' | \
   xargs grep -l '\.insert(' | \
   grep -v 'factories.ts' > /dev/null; then
  echo "❌ ERROR: Direct .insert() calls found in test files"
  echo "Use factories from tests/helpers/factories.ts instead"
  exit 1
fi
```

**Implementation Option C: CI Check**

Add to GitHub Actions workflow:
```yaml
- name: Check for raw inserts in tests
  run: |
    if grep -r "\.insert(" tests/ --include="*.spec.ts" | grep -v "factories.ts"; then
      echo "::error::Direct .insert() calls found in test files. Use factories instead."
      exit 1
    fi
```

---

## Policy Verification

### Tenant-Injection Test Assertions

**Current Policy:** Server **ignores** `organizationId` in request body and uses authenticated session org.

**Test Coverage:**
- ✅ POST `/api/admin/campsites` - verifies created resource uses session org, not injected org
- ✅ PATCH `/api/admin/campsites/[id]` - verifies updates don't change org
- ✅ Cross-org access - verifies resource scoping to session org

**Assertions Match Policy:** ✅ Yes
- Tests verify `body.data.organization_id === LEGIT_ORG_ID`
- Tests verify `body.data.organization_id !== ATTACKER_ORG_ID`

---

## Optional: Future Hardening

### 1. Centralize Rate-Limit Response Helper

**Current State:** Rate-limit headers added manually to each route

**Future Improvement:** Create `withRateLimit()` wrapper:
```typescript
// lib/api-helpers.ts
export function withRateLimit<T>(
  handler: (req: Request, rlResult: RateLimitResult) => Promise<Response>
) {
  return async (req: Request) => {
    const ip = getClientIp(req);
    const rlResult = await checkRateLimit(...);
    
    if (!rlResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: getRateLimitHeaders(rlResult) }
      );
    }
    
    return handler(req, rlResult);
  };
}
```

### 2. TypeGen Drift Protection

**Option A: CI Drift Check (Recommended)**
```yaml
- name: Check type generation drift
  run: |
    npm run typegen
    git diff --exit-code supabase/types.ts || \
      (echo "::error::Types are out of sync. Run 'npm run typegen'" && exit 1)
```

**Option B: Documentation Only**
- ✅ Already documented in `supabase/README.md`
- Add reminder to PR template
- Include in developer onboarding

---

## PR Description Template

```markdown
## Summary
Fixes 45 failing Playwright tests and implements durability hardening for long-term stability.

## Changes

### Test Fixes
- **Multi-tenancy**: Added `organization_id` to all test database inserts
- **Locator stability**: Replaced `.first()` with `data-testid` and scoped selectors
- **Project isolation**: Verified mobile tests route to `mobile-chrome` project
- **Error assertions**: Switched to structured error shape validation (vs brittle message matching)

### Durability Hardening
- **Centralized factories**: Created `tests/helpers/factories.ts` with mandatory `organization_id` validation
- **Tenant-injection test**: Added `tests/security/tenant-injection.spec.ts` to prevent org ID spoofing
- **Rate-limit headers**: Applied to ALL response paths (200/400/403/404/429/500) across APIs
- **Tech debt tracking**: Documented remaining migrations in `docs/testing/factory-migration-tech-debt.md`

### API Changes
- Updated `app/api/availability/search/route.ts` - rate-limit headers on all paths
- Updated `app/api/create-payment-intent/route.ts` - rate-limit headers on error paths
- Updated `app/api/reservation/route.ts` - rate-limit headers on all paths
- Updated `lib/api-helpers.ts` - `validationError()` accepts optional headers

## Verification

Run the merge readiness checklist:
```bash
npx playwright test --project=admin --repeat-each=3
npx playwright test --project=mobile-chrome --repeat-each=2
npx playwright test --project=admin --workers=4
npx playwright test tests/security/tenant-injection.spec.ts
npx playwright test tests/security/rate-limiting.spec.ts
```

**Results:** _(Paste test output here)_

## Breaking Changes
None - all changes are backward compatible.

## Security Impact
✅ Positive - prevents tenant escape hatches and standardizes test data creation.
```

---

## Checklist Before Merge

- [ ] All stability verification commands passing
- [ ] No test flakes in repeat runs
- [ ] Tenant-injection test passes
- [ ] Rate-limiting test passes
- [ ] Tech debt doc reviewed
- [ ] PR description includes verification results
- [ ] (Optional) Raw insert guardrail added to CI/pre-commit
- [ ] (Optional) Typegen drift check added to CI
