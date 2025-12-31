# Lessons Learned: Test Stability & Front-End Design

**Document Date:** 2025-12-31
**Context:** E2E Test Stabilization & Lint/Type System Improvements

This document captures critical lessons learned from resolving test failures, improving code quality, and hardening the front-end architecture.

---

## Table of Contents
1. [E2E Test Stability](#e2e-test-stability)
2. [Front-End Design Patterns](#front-end-design-patterns)
3. [TypeScript Type System](#typescript-type-system)
4. [CI/CD Configuration](#cicd-configuration)
5. [Code Quality Standards](#code-quality-standards)

---

## E2E Test Stability

### 1. Overlay Interception Issues

**Problem:**
Drag-and-drop tests were failing due to modal backdrops, toast notifications, and other overlays intercepting mouse events during drag operations.

**Root Cause:**
- React portals create fixed-position overlays with high z-index
- Overlays appear/disappear based on state changes during interactions
- Playwright's `.dragTo()` method can be intercepted by these overlays

**Solution:**
Created aggressive overlay defense system (`tests/helpers/calendarE2E.ts`):

```typescript
// Key techniques:
1. MutationObserver - Watches DOM for new overlay elements
2. Periodic scanning - 50ms interval to catch rapid toggles
3. Preemptive pointer-events disabling - Neutralize overlays before removal
4. Retry logic - Multiple attempts with overlay cleanup between retries
```

**Lessons:**
- ✅ **Never assume a clean DOM** - Overlays can appear at any time
- ✅ **Defense in depth** - Combine multiple strategies (observer + polling + retries)
- ✅ **Disable before remove** - Set `pointer-events: none` before removing elements
- ✅ **Test in isolation** - Run drag tests with explicit overlay cleanup
- ❌ **Avoid brittle selectors** - Don't rely on specific class names for overlays

**Implementation Pattern:**
```typescript
// Before any drag operation:
await dismissDialogs(page);
await installOverlayObserver(page);
await killBackdropsUntilStable(page, 3);
await dragToWithOverlayDefense(page, source, target, { attempts: 3 });
```

---

### 2. Timing and Race Conditions

**Problem:**
Tests expecting immediate UI updates failed because state changes took time to propagate through React, API calls, and re-renders.

**Examples:**
- Toast notifications appearing after failsafe timeout
- Calendar revalidation completing before assertions
- Drag-and-drop DOM updates lagging behind mouse events

**Solutions:**

**a) Explicit Waits for State Propagation:**
```typescript
// ❌ BAD - Assumes immediate update
await expect(toast).toBeVisible({ timeout: 1000 });

// ✅ GOOD - Allow time for state change to trigger
await page.waitForTimeout(600); // Wait for failsafe timeout
await expect(toast).toBeVisible({ timeout: 2000 });
```

**b) Polling with Retry Logic:**
```typescript
// Wait for React state + API + re-render cycle
await page.waitForFunction(() => {
  const el = document.querySelector('[data-reservation-id="..."]');
  return el?.getAttribute('data-campsite-id') === expectedId;
}, { timeout: 5000 });
```

**c) Network Idle vs. Load State:**
```typescript
// ❌ BAD - May miss delayed API calls
await page.waitForLoadState('load');

// ✅ GOOD - Wait for all network activity to settle
await page.waitForLoadState('networkidle');
```

**Lessons:**
- ✅ **Add margin to timeouts** - If failsafe triggers at 500ms, wait 600ms before checking
- ✅ **Use waitForFunction for complex conditions** - Better than polling manually
- ✅ **Expect delays after drag operations** - DOM updates aren't instant
- ❌ **Don't trust immediate assertions** - React state updates are asynchronous

---

### 3. Window Type Safety in Tests

**Problem:**
Test files added properties to `window` object (e.g., `window.getDateFromPointer`), causing ESLint `no-explicit-any` errors.

**Initial Approach (Wrong):**
```typescript
// ❌ ESLint error: Unsafe use of 'any'
(window as any).getDateFromPointer = function() { ... };
```

**Attempted Fix (Failed):**
```typescript
// ❌ TypeScript error: Circular reference
interface TestWindow extends Window { ... }
declare global { interface Window extends TestWindow {} }
```

**Final Solution (Correct):**
```typescript
// ✅ Direct augmentation without circular reference
// tests/types.d.ts
declare global {
  interface Window {
    getDateFromPointer?: (x: number, y: number) => string | null;
    __e2e_removed_overlays__?: Array<{ tag: string; className: string }>;
  }
}
```

**Lessons:**
- ✅ **Use global type augmentation** - Extend Window directly, not via intermediate interfaces
- ✅ **Mark test properties as optional** - Use `?:` since they're only set in specific tests
- ✅ **Centralize test types** - Single `tests/types.d.ts` file for all test globals
- ❌ **Don't use `any` even in tests** - Proper types improve test reliability

---

### 4. Test Data Multi-Tenancy

**Problem:**
Tests failed with missing `organization_id` errors after multi-tenancy migration.

**Root Cause:**
Database schema requires `organization_id NOT NULL`, but test factories and inline data didn't include it.

**Solution:**
```typescript
// ✅ ALWAYS include organization_id in test data
const testReservation = {
  first_name: 'Test',
  last_name: 'User',
  organization_id: DEFAULT_ORG_ID, // Critical!
  // ... other fields
};
```

**Lessons:**
- ✅ **Update test data with schema changes** - Migration scripts don't update test code
- ✅ **Use constants for test IDs** - `DEFAULT_ORG_ID` prevents typos
- ✅ **Validate test data completeness** - Check for required fields in test setup
- ❌ **Don't assume defaults** - Supabase won't auto-fill NOT NULL columns

---

## Front-End Design Patterns

### 1. Calendar Drag-and-Drop Architecture

**Challenge:**
Calendar needed to support drag-and-drop for reservations and blackout dates across different rows (campsites) and date ranges.

**Key Design Decisions:**

**a) Hit Testing with Overlays:**
```typescript
// Problem: document.elementsFromPoint() returns overlays first
// Solution: Filter out known overlay patterns
function getDateFromPointer(clientX: number, clientY: number) {
  const elements = document.elementsFromPoint(clientX, clientY);
  const validElements = elements.filter(el => {
    if (el.getAttribute('data-testid') === 'toast') return false;
    if (el.hasAttribute('data-ghost-mode')) return false;
    if (el.classList.contains('fixed') && el.classList.contains('inset-0')) return false;
    return true;
  });

  for (const el of validElements) {
    const cell = el.closest('[data-date]');
    if (cell) return cell.getAttribute('data-date');
  }
  return null;
}
```

**b) Ghost Preview Management:**
```typescript
// Problem: Ghost preview blocks clicks on actual calendar cells
// Solution: pointer-events: none on ghost elements
.ghost-preview {
  position: absolute;
  pointer-events: none; /* Critical! */
  z-index: 10;
}
```

**Lessons:**
- ✅ **Use data attributes for hit testing** - More reliable than class names
- ✅ **Filter overlay patterns explicitly** - Document common patterns (toast, backdrop, ghost)
- ✅ **Disable pointer events on previews** - Ghost elements should never intercept clicks
- ✅ **Test hit detection in unit tests** - Created `calendar-hit-test.spec.ts` for isolation

---

### 2. Toast Notification System

**Challenge:**
Toast notifications were appearing in front of drag operations, blocking interactions.

**Design Issues:**
```css
/* ❌ BAD - Blocks all interactions */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
}
```

**Solution:**
```css
/* ✅ GOOD - Allow clicks to pass through */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  pointer-events: none; /* Toast should never block clicks */
}

.toast-content {
  pointer-events: auto; /* Only interactive elements inside toast */
}
```

**Lessons:**
- ✅ **Notifications should never block UI** - Use `pointer-events: none` on container
- ✅ **Use corner positioning** - Keep toasts away from interactive areas
- ✅ **Auto-dismiss by default** - Don't require user interaction to clear toasts
- ❌ **Don't use full-screen overlays for toasts** - Reserve those for modals only

---

### 3. Modal Dialog Management

**Challenge:**
Modals would sometimes persist after closing, especially during test runs.

**Pattern Implemented:**
```typescript
// Radix UI Dialog with proper cleanup
export function MyDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={() => onOpenChange(false)}>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}

// Test helpers for reliable cleanup
export async function dismissDialogs(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5000 });
  }
}
```

**Lessons:**
- ✅ **Always provide escape hatch** - ESC key should close modals
- ✅ **Wait for close animation** - Use `toBeHidden()` not just state change
- ✅ **Test modal cleanup explicitly** - Add assertions that dialog is gone
- ✅ **Use Radix UI patterns** - Built-in portal and focus management

---

## TypeScript Type System

### 1. Proper Type Narrowing

**Problem:**
Using `unknown` for type safety caused issues where TypeScript couldn't infer safe usage.

**Examples:**

**a) Array Filter with Type Guard:**
```typescript
// ❌ BAD - TypeScript doesn't know type after filter
const items = array.filter((item: unknown) => typeof item === 'object');

// ✅ GOOD - Use inline type or type guard
const items = array.filter((item: { id: string }) => item.id === targetId);

// ✅ ALSO GOOD - Explicit type guard
function isValidItem(item: unknown): item is { id: string } {
  return typeof item === 'object' && item !== null && 'id' in item;
}
const items = array.filter(isValidItem);
```

**b) Error Handling:**
```typescript
// ❌ BAD - Can't access .message on unknown
catch (err: unknown) {
  console.log(err.message); // TypeScript error
}

// ✅ GOOD - Use type guard
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.log(message);
}
```

**Lessons:**
- ✅ **Use inline types for simple cases** - `(item: { id: string })` is clearer than `unknown`
- ✅ **Create type guards for reusable checks** - Named functions document intent
- ✅ **Prefer `unknown` over `any`** - Forces explicit type checking
- ❌ **Don't overuse `unknown`** - Use specific types when structure is known

---

### 2. Avoiding Circular Type References

**Problem:**
Attempting to extend `Window` interface with another interface caused circular reference.

```typescript
// ❌ FAILS - Circular reference
interface TestWindow extends Window {
  customProp?: string;
}
declare global {
  interface Window extends TestWindow {}
}
```

**Solution:**
```typescript
// ✅ WORKS - Direct augmentation
declare global {
  interface Window {
    customProp?: string;
  }
}
```

**Lessons:**
- ✅ **Augment global types directly** - Don't use intermediate interfaces
- ✅ **Keep type declarations simple** - Avoid inheritance in global augmentation
- ✅ **Use optional properties** - Test-specific properties should be optional

---

### 3. Function Type Declarations

**Problem:**
Playwright's `page.waitForFunction` required specific parameter types.

**Wrong:**
```typescript
// ❌ TypeScript error - Array vs Tuple mismatch
await page.waitForFunction((args: [string, string]) => {
  const [id, expected] = args;
  // ...
}, [id, expected]);
```

**Right:**
```typescript
// ✅ Use object destructuring instead
await page.waitForFunction(({ id, expected }: { id: string; expected: string }) => {
  // ...
}, { id, expected });
```

**Lessons:**
- ✅ **Use object parameters for multiple args** - More flexible than tuples
- ✅ **Destructure in function signature** - Makes types explicit
- ❌ **Don't fight with library types** - Adapt your code to the library's patterns

---

## CI/CD Configuration

### 1. Environment Secrets Management

**Problem:**
E2E tests failed in CI with "Missing secret NEXT_PUBLIC_SUPABASE_URL" even though code was correct.

**Root Cause:**
GitHub Actions secrets weren't configured in repository settings.

**Solution Process:**
1. Read credentials from `.env.local`
2. Add each secret via `gh secret set`
3. Verify with `gh secret list`
4. Re-run failed workflows

```bash
# Add secrets programmatically
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://..."
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "sb_publishable_..."
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "sb_secret_..."
gh secret set TEST_ADMIN_EMAIL --body "admin@test.com"
gh secret set TEST_ADMIN_PASSWORD --body "testpass123"
```

**Lessons:**
- ✅ **Document required secrets** - Add to README or CI docs
- ✅ **Use gh CLI for secret management** - Faster than web UI
- ✅ **Verify secrets after adding** - Use `gh secret list` to confirm
- ✅ **Test locally first** - Ensure `.env.test` works before setting CI secrets
- ❌ **Don't commit secrets** - Keep `.env.local` in `.gitignore`

---

### 2. Pre-existing vs. New Errors

**Problem:**
CI failed with errors that existed before recent changes, making it unclear what broke.

**Approach:**
1. **Separate concerns** - Fix lint errors separately from test failures
2. **Document pre-existing issues** - Note which errors were already present
3. **Fix in dependency order** - Lint → Type → Tests → Build

**Example Decision Tree:**
```
CI Failure
├─ Lint errors (31 found)
│  ├─ Related to my changes? → Fix immediately
│  └─ Pre-existing? → Fix separately or document
├─ Type errors
│  ├─ In my new code? → Fix before committing
│  └─ In old code? → Fix if blocking CI
└─ Test failures
   ├─ New test failures? → My bug, fix it
   └─ Flaky tests? → Investigate and harden
```

**Lessons:**
- ✅ **Fix lint errors first** - They're usually easiest and unblock type checking
- ✅ **Separate PRs for pre-existing issues** - Don't mix new features with cleanup
- ✅ **Use `--max-warnings=0`** - Enforce zero-warning policy from the start
- ❌ **Don't ignore pre-existing errors** - They accumulate and block progress

---

### 3. Test Isolation and Dependencies

**Problem:**
Tests shared global state, causing failures when run in parallel or different order.

**Solutions:**

**a) Playwright Projects for Isolation:**
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'admin', dependencies: ['setup'], use: { storageState: 'tests/.auth/admin.json' } },
    { name: 'guest', testMatch: /guest\/.*\.spec\.ts/ },
  ],
});
```

**b) Database Reset Between Tests:**
```typescript
test.beforeEach(async () => {
  // Reset only test data, not entire DB
  await supabaseAdmin.from('reservations')
    .delete()
    .eq('organization_id', DEFAULT_ORG_ID)
    .ilike('email', '%@test.com%');
});
```

**Lessons:**
- ✅ **Use test projects for isolation** - Separate setup, admin, guest contexts
- ✅ **Reset state between tests** - Use `beforeEach` for test data cleanup
- ✅ **Scope resets carefully** - Only delete test data, not production data
- ❌ **Don't rely on test execution order** - Each test should be independent

---

## Code Quality Standards

### 1. ESLint Configuration

**Standard Adopted:**
```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      'react/no-unescaped-entities': 'error',
    },
  },
];

// package.json
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0"
  }
}
```

**Lessons:**
- ✅ **Zero warnings policy** - Use `--max-warnings=0` to prevent warning accumulation
- ✅ **Fail CI on lint errors** - Don't merge code that doesn't pass lint
- ✅ **Fix lint errors before type errors** - Lint is faster and catches more issues
- ✅ **Document exceptions** - If `any` is truly needed, add comment explaining why

---

### 2. Import Patterns

**Problem:**
Tests used CommonJS `require()` which triggered lint errors.

**Migration:**
```typescript
// ❌ OLD
const { createTestReservation, supabaseAdmin } = require('../helpers/test-supabase');

// ✅ NEW
import { createTestReservation, supabaseAdmin } from '../helpers/test-supabase';
```

**Lessons:**
- ✅ **Use ES6 imports everywhere** - Even in test files
- ✅ **Configure tsconfig for ES modules** - Set `"module": "esnext"`
- ✅ **Update all files in one commit** - Prevents mixed import styles

---

### 3. React Best Practices

**HTML Entity Encoding:**
```tsx
// ❌ BAD - Lint error: react/no-unescaped-entities
<span>"Search query"</span>

// ✅ GOOD - Use HTML entities
<span>&ldquo;Search query&rdquo;</span>

// ✅ ALSO GOOD - Use variables
<span>{`"Search query"`}</span>
```

**Lessons:**
- ✅ **Use HTML entities for quotes** - `&ldquo;` and `&rdquo;` for typographic quotes
- ✅ **Use template literals for dynamic content** - Clearer than entity encoding
- ✅ **Enable lint rule** - Catches these issues early

---

## Key Takeaways

### Test Stability
1. **Overlays are the enemy** - Implement aggressive defense mechanisms
2. **Timing matters** - Add margin to timeouts, use `waitForFunction`
3. **Isolation is critical** - Reset state, use test projects, avoid shared state

### Front-End Design
1. **Pointer events control interaction** - Use `none` on non-interactive overlays
2. **Hit testing needs filtering** - Ignore known overlay patterns
3. **Modal cleanup is essential** - Test that dialogs fully close

### TypeScript
1. **Avoid circular type references** - Augment globals directly
2. **Prefer specific types over unknown** - Use type guards when needed
3. **Test types matter** - Create `tests/types.d.ts` for test-specific augmentation

### CI/CD
1. **Secrets must be configured** - Code can't fix missing configuration
2. **Fix in order** - Lint → Types → Tests → Build
3. **Isolate test runs** - Use projects and proper dependency setup

### Code Quality
1. **Zero warnings policy** - Use `--max-warnings=0`
2. **ES6 imports everywhere** - No CommonJS in modern TypeScript
3. **Fix root causes** - Don't just disable lint rules

---

## Future Improvements

### Testing
- [ ] Add visual regression testing for calendar drag-and-drop
- [ ] Create performance benchmarks for drag operations
- [ ] Implement screenshot comparison for overlay states

### Front-End
- [ ] Refactor overlay detection into reusable hook
- [ ] Create standardized toast notification component
- [ ] Document z-index layering system

### CI/CD
- [ ] Add secret validation in CI workflow
- [ ] Create script to verify all required env vars
- [ ] Implement automatic lint fixing on pre-commit

---

**Document Maintained By:** Development Team
**Last Updated:** 2025-12-31
**Review Schedule:** Quarterly or after major test/architecture changes
