# Visual Regression Snapshots

This directory contains baseline screenshots of key admin UI screens. These serve as:

1. **Visual regression baseline** - Compare future changes against current state
2. **Portfolio screenshots** - Show design system in action
3. **Before/after proof** - Document refactoring impact

---

## Required Screenshots

### 1. Admin Dashboard
**File:** `admin-dashboard.png`
**URL:** `http://localhost:3000/admin`
**State:** Normal view with OnboardingChecklist visible
**Viewport:** 1920x1080

### 2. Reservations - Loading State
**File:** `reservations-loading.png`
**URL:** `http://localhost:3000/admin`
**State:** Trigger by refreshing page, capture skeleton screens
**Viewport:** 1920x1080

### 3. Reservations - Error State
**File:** `reservations-error.png`
**URL:** `http://localhost:3000/admin`
**State:** Disconnect network or break API, capture error message
**Viewport:** 1920x1080

### 4. Reservations - Populated
**File:** `reservations-populated.png`
**URL:** `http://localhost:3000/admin`
**State:** Normal view with reservation data in table
**Viewport:** 1920x1080

### 5. Calendar View
**File:** `calendar-view.png`
**URL:** `http://localhost:3000/admin/calendar`
**State:** Calendar with drag-and-drop reservations visible
**Viewport:** 1920x1080

### 6. Campsite Management
**File:** `campsite-management.png`
**URL:** `http://localhost:3000/admin/campsites`
**State:** Campsite list table view
**Viewport:** 1920x1080

---

## How to Capture

### Option 1: Browser DevTools (Manual)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open Chrome/Edge DevTools (F12)

3. Set viewport to 1920x1080:
   - Toggle device toolbar (Ctrl+Shift+M)
   - Set "Responsive" with 1920x1080 dimensions

4. Navigate to each URL above

5. Take screenshot:
   - Chrome: DevTools → 3-dot menu → Capture screenshot
   - Or use browser screenshot extension

6. Save with exact filename to `docs/screens/`

### Option 2: Playwright (Automated - Future)

When ready for automation, use this script:

```typescript
import { test } from '@playwright/test';

test('capture admin screenshots', async ({ page }) => {
  await page.goto('http://localhost:3000/admin');

  // Admin dashboard
  await page.screenshot({
    path: 'docs/screens/admin-dashboard.png',
    fullPage: false
  });

  // Calendar view
  await page.goto('http://localhost:3000/admin/calendar');
  await page.screenshot({
    path: 'docs/screens/calendar-view.png',
    fullPage: false
  });

  // ... etc
});
```

---

## Screenshot Standards

- **Format:** PNG (lossless)
- **Viewport:** 1920x1080 (desktop standard)
- **DPI:** Native (96 or 144)
- **Naming:** kebab-case matching filenames above
- **Content:** Hide sensitive data (use test accounts)

---

## When to Update

Update screenshots when:
- Design system tokens change
- Major UI refactoring occurs
- Component layouts are modified
- New admin features are added

**Always commit before/after pairs** to show visual diff in PR reviews.

---

Last updated: 2025-01-14
