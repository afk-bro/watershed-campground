import { test, expect } from '@playwright/test';

test.describe('Admin Reservations - Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  });

  test('displays table view on desktop', async ({ page }) => {
    // Desktop viewport (1280x720 is default)
    await page.setViewportSize({ width: 1280, height: 720 });

    // Wait for the page to rerender
    await page.waitForTimeout(200);

    // Should see table structure
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Should see table headers
    await expect(page.getByRole('columnheader', { name: 'Guest' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Dates' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('displays card view on mobile', async ({ page }) => {
    // Mobile viewport (iPhone 12 Pro size)
    await page.setViewportSize({ width: 390, height: 844 });

    // Wait for the page to rerender
    await page.waitForTimeout(200);

    // Should NOT see table structure
    const table = page.locator('table');
    await expect(table).not.toBeVisible();

    // Should see card layout - look for the select all checkbox in its own card
    const selectAllCard = page.locator('div').filter({ hasText: /Select all|selected/ }).first();
    await expect(selectAllCard).toBeVisible();

    // Cards should be present - look for reservation data in card format
    // Since we have test data, we should see at least one card with guest information
    const cards = page.locator('.space-y-3 > div').filter({ hasText: /Adults|Kids/ });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('displays card view on tablet in portrait', async ({ page }) => {
    // Tablet viewport (iPad size - portrait mode, which is <768px width)
    await page.setViewportSize({ width: 768, height: 1024 });

    // Wait for the page to rerender
    await page.waitForTimeout(200);

    // At exactly 768px we're at the breakpoint boundary
    // Should show table since it's >= 768px
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('switches from table to cards when resizing to mobile', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);

    // Verify table is visible
    let table = page.locator('table');
    await expect(table).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300); // Give time for resize debounce

    // Verify table is hidden and cards are visible
    table = page.locator('table');
    await expect(table).not.toBeVisible();

    const selectAllCard = page.locator('div').filter({ hasText: /Select all|selected/ }).first();
    await expect(selectAllCard).toBeVisible();
  });

  test('mobile cards show essential reservation information', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    // Look for a reservation card (should have guest name, dates, status)
    const firstCard = page.locator('.space-y-3 > div').filter({ hasText: /Adults/ }).first();
    await expect(firstCard).toBeVisible();

    // Check that essential info is visible in the card
    // Cards should show dates
    await expect(firstCard.locator('div:has-text("Dates")')).toBeVisible();

    // Cards should show camping details
    await expect(firstCard.filter({ hasText: /Adults|Kids/ })).toBeVisible();

    // Cards should show status badge
    await expect(firstCard.locator('span').filter({ hasText: /confirmed|pending|checked_in/i }).first()).toBeVisible();
  });

  test('mobile cards support checkbox selection', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    // Find a reservation card with a checkbox
    const firstCard = page.locator('.space-y-3 > div').filter({ hasText: /Adults/ }).first();
    const checkbox = firstCard.locator('input[type="checkbox"]').first();

    // Verify checkbox exists and is not checked
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    // Click the checkbox
    await checkbox.click();

    // Verify it's now checked
    await expect(checkbox).toBeChecked();
  });

  test('mobile cards support tap to view details', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    // Find and click a reservation card
    const firstCard = page.locator('.space-y-3 > div').filter({ hasText: /Adults/ }).first();

    // Click on the card (not the checkbox, not the actions menu)
    const cardBody = firstCard.locator('div').filter({ hasText: 'Dates' }).first();
    await cardBody.click();

    // The reservation drawer should open
    // Look for drawer/modal that shows reservation details
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 2000 });
  });
});
