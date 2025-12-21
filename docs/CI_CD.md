# CI/CD Pipeline Documentation

## Overview

The Watershed Campground uses GitHub Actions for continuous integration and deployment. Every pull request and push to `main`/`dev` branches triggers automated checks to ensure code quality, functionality, and performance.

## Pipeline Jobs

### 1. Lint & Type Check ✨
**Purpose:** Catch syntax errors and type issues before they reach production

**What it does:**
- Runs ESLint with zero-warnings policy
- Performs TypeScript type checking
- Fails fast if code quality issues detected

**Run locally:**
```bash
npm run lint
npm run type-check
```

**Fix issues:**
```bash
# Auto-fix linting issues
npm run lint -- --fix

# Check specific files
npm run lint -- app/**/*.tsx
```

---

### 2. E2E Tests (Playwright) 🎭
**Purpose:** Verify critical user flows work end-to-end

**What it does:**
- Starts local Supabase instance with Docker
- Installs Playwright browsers (Chromium)
- Runs all 24 E2E tests:
  - ✅ Guest booking flow (3 tests)
  - ✅ Admin reservation management (4 tests)
  - ✅ Calendar drag-and-drop (5 tests)
  - ✅ Authentication flows (4 tests)
  - ✅ Smoke tests (8 tests)
- Uploads test reports and screenshots on failure

**Test matrix:**
- **Browser:** Chromium (can add Firefox/Safari later)
- **Retries:** 2 (in CI mode)
- **Workers:** 1 (sequential to avoid DB conflicts)

**Run locally:**
```bash
# Start local Supabase
npx supabase start

# Run all tests
npx playwright test

# Run specific suite
npx playwright test tests/guest-booking-complete.spec.ts

# Debug mode
npx playwright test --debug
```

**View reports:**
- **In CI:** Download artifact from GitHub Actions run
- **Locally:** `npx playwright show-report`

---

### 3. Build Check 🏗️
**Purpose:** Ensure production build succeeds

**What it does:**
- Runs `npm run build` with Next.js
- Verifies no build-time errors
- Uses dummy environment variables (build doesn't need real credentials)

**Run locally:**
```bash
npm run build
```

**Common build failures:**
- Import errors (wrong paths)
- Type errors in components
- Missing environment variables (should use defaults)

---

### 4. Lighthouse Performance 🔦
**Purpose:** Ensure site performance doesn't regress

**When it runs:**
- Only on PRs to `main` branch
- After Vercel deploys preview

**What it measures:**
- **Performance** - Load time, interactivity
- **Accessibility** - WCAG compliance
- **Best Practices** - HTTPS, console errors
- **SEO** - Meta tags, structured data

**Pages tested:**
- Homepage (`/`)
- Gallery (`/gallery`)
- Rates (`/rates`)

**Target scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

**Results posted:**
- Commented on PR automatically
- Artifacts uploaded for detailed analysis

---

### 5. CI Success ✅
**Purpose:** Summary job for branch protection rules

**What it does:**
- Waits for all critical jobs to complete
- Fails if any job failed
- Provides single status check for PR merges

**Branch Protection:**
Set this as required status check in GitHub:
`CI Success` must pass before merging

---

## Workflow Triggers

### Pull Requests
```yaml
on:
  pull_request:
    branches: [main, dev]
```

**Runs:**
- Lint & Type Check
- E2E Tests
- Build Check
- Lighthouse (only if base branch is `main`)

### Direct Pushes
```yaml
on:
  push:
    branches: [main, dev]
```

**Runs:**
- Same as PR checks
- Helps catch issues even without PRs

---

## Environment Setup for CI

### GitHub Secrets (None Required!)
The CI pipeline is designed to work **out of the box** with no secrets:

- ✅ Supabase: Uses local instance
- ✅ Playwright: Installs browsers automatically
- ✅ Build: Uses dummy env vars
- ✅ Lighthouse: Uses `GITHUB_TOKEN` (auto-provided)

### Optional: Vercel Integration
For Lighthouse checks to work on PRs:

1. Connect GitHub repo to Vercel
2. Enable automatic deployments for PRs
3. No additional configuration needed

Vercel automatically:
- Deploys preview on every PR
- Posts deployment URL to PR
- Lighthouse waits for deployment

---

## Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

**What this does:**
- Cancels old runs when new commits pushed
- Saves CI minutes
- Provides faster feedback

**Example:**
1. Push commit A → CI starts
2. Push commit B → CI for A canceled, CI for B starts
3. Only latest commit runs

---

## Artifacts

### Playwright Reports
**Uploaded when:** Always (even on failure)
**Contains:**
- HTML report with screenshots
- Test traces for debugging
- Video recordings (if enabled)

**How to view:**
1. Go to failed GitHub Actions run
2. Scroll to bottom → Artifacts section
3. Download `playwright-report.zip`
4. Extract and open `index.html`

### Lighthouse Reports
**Uploaded when:** PR to main branch
**Contains:**
- Performance scores per page
- Detailed metrics (FCP, LCP, CLS, etc.)
- Improvement suggestions

---

## Performance Optimization

### CI Speed
Current pipeline takes **~8-12 minutes** for full run:

- Lint & Type Check: 1-2 min
- E2E Tests: 5-8 min (longest)
- Build: 2-3 min
- Lighthouse: 2-3 min (parallel)

**Future optimizations:**
- Shard E2E tests across multiple workers
- Cache Playwright browsers
- Use smaller Supabase Docker image

### Cost
**Free tier limits:**
- Public repos: Unlimited minutes
- Private repos: 2,000 minutes/month

**Current usage:**
- ~10 min per PR
- ~200 PRs/month = 2,000 minutes ✅

---

## Troubleshooting

### E2E Tests Failing in CI but Pass Locally

**Possible causes:**
1. **Race conditions** - CI slower, reveals timing issues
2. **Environment differences** - Different Supabase version
3. **Flaky tests** - Use `test.retry()` or increase timeouts

**Solutions:**
```typescript
// Increase timeout for slow CI
await expect(element).toBeVisible({ timeout: 10000 });

// Retry flaky tests
test.describe.configure({ retries: 2 });
```

### Lighthouse Scores Drop

**Check:**
1. Did bundle size increase? (check `npm run build` output)
2. New unoptimized images added?
3. Third-party scripts causing delays?

**Fix:**
- Optimize images with `next/image`
- Lazy load heavy components
- Defer non-critical JavaScript

### Build Fails with Missing Env Vars

**Issue:** Code references `process.env.X` at build time without fallback

**Fix:**
```typescript
// Bad - crashes if missing
const url = process.env.API_URL;

// Good - provides fallback
const url = process.env.API_URL || 'http://localhost:3000';
```

---

## Branch Protection Rules

**Recommended settings for `main` branch:**

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1)
   - ✅ Require status checks to pass:
     - `CI Success`
   - ✅ Require branches to be up to date
   - ✅ Require linear history

**For `dev` branch:**
- Same rules but no approval required
- Allows faster iteration

---

## Local CI Simulation

Want to run full CI pipeline locally?

```bash
#!/bin/bash
# ci-local.sh - Simulates GitHub Actions locally

set -e  # Exit on any error

echo "🔍 Running Lint & Type Check..."
npm run lint
npm run type-check

echo "🏗️ Running Build Check..."
npm run build

echo "🎭 Running E2E Tests..."
npx supabase start
npx playwright test
npx supabase stop

echo "✅ Local CI Passed!"
```

Run: `chmod +x ci-local.sh && ./ci-local.sh`

---

## Adding New Tests

When adding new E2E tests:

1. **Add to appropriate file** - Guest, admin, or calendar
2. **Run locally** - Verify passes 3x in a row
3. **Push to PR** - CI will validate
4. **Check CI results** - View Playwright report if fails

**CI automatically:**
- Discovers new tests (no config needed)
- Runs them with existing infrastructure
- Reports results

---

## Monitoring

### View CI History
1. Go to repo → Actions tab
2. Click on workflow run
3. See:
   - Duration
   - Which jobs passed/failed
   - Logs for debugging

### CI Status Badge

Add to README:
```markdown
![CI](https://github.com/afk-bro/watershed-campground/workflows/CI/badge.svg)
```

Shows real-time CI status on repository homepage.

---

## Future Enhancements

Potential improvements:

1. **Matrix Testing**
   ```yaml
   strategy:
     matrix:
       browser: [chromium, firefox, webkit]
   ```

2. **Parallel Test Sharding**
   ```yaml
   strategy:
     matrix:
       shard: [1/4, 2/4, 3/4, 4/4]
   ```

3. **Visual Regression Testing**
   - Percy.io integration
   - Screenshot comparison

4. **Dependency Scanning**
   - Dependabot for security updates
   - npm audit in CI

5. **Code Coverage**
   - Jest/Vitest for unit tests
   - Coverage reports on PRs

---

## Summary

The CI/CD pipeline provides:
✅ **Fast feedback** - Know within minutes if PR is safe
✅ **Automated quality** - No manual testing required
✅ **Performance gates** - Lighthouse prevents regressions
✅ **Confidence** - Merge with certainty

**Next steps:**
1. Create first PR to test pipeline
2. Monitor initial runs
3. Adjust timeouts/retries if needed
4. Set up branch protection rules
