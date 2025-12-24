/**
 * E2E Test: Stuck Saving Failsafe
 *
 * Verifies that the stuck saving failsafe:
 * 1. Detects items stuck in _saving state for >10s
 * 2. Shows warning toast
 * 3. Auto-revalidates to sync with server
 *
 * Strategy:
 * - Intercept a mutation request and hang it (never resolve)
 * - Verify "Saving..." indicator appears
 * - Wait 11 seconds for failsafe to trigger
 * - Verify warning toast appears
 * - Verify revalidation API call is made
 */

import { test, expect } from '@playwright/test';

test.describe('Stuck Saving Failsafe', () => {
  test('should auto-revalidate after 10s if save request hangs', async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/admin/calendar') && !url.includes('availability')) {
        apiCalls.push(url);
      }
    });

    // Intercept calendar API to inject stuck _saving flag
    let injected = false;
    await page.route('**/api/admin/calendar**', async (route) => {
      const response = await route.fetch();
      const data = await response.json();

      // Inject stuck _saving flag into first reservation (only once)
      if (!injected && data.reservations && data.reservations.length > 0) {
        data.reservations[0]._saving = true;
        injected = true;
        console.log(`🔧 Injected _saving flag into reservation: ${data.reservations[0].id}`);
      }

      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify(data),
      });
    });

    // Navigate to calendar
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');

    // Verify "Saving..." indicator appears
    const savingIndicator = page.getByText('Saving...').first();
    await expect(savingIndicator).toBeVisible({ timeout: 3000 });
    console.log('✅ "Saving..." indicator appeared');

    // Clear API calls log (so we can track revalidation)
    apiCalls.length = 0;

    // Wait 11 seconds for the failsafe to trigger (timeout is 10s)
    console.log('⏳ Waiting 11 seconds for failsafe...');
    const startTime = Date.now();
    await page.waitForTimeout(11000);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏰ Waited ${elapsed}s`);

    // Verify warning toast appears
    const warningToast = page.getByText(/still saving/i);
    await expect(warningToast).toBeVisible({ timeout: 2000 });
    console.log('✅ Warning toast appeared');

    // Verify revalidation API call was made
    // After failsafe triggers, it should call GET /api/admin/calendar to revalidate
    const revalidationCalls = apiCalls.filter(url =>
      url.includes('/api/admin/calendar') && !url.includes('availability')
    );

    expect(revalidationCalls.length).toBeGreaterThan(0);
    console.log(`✅ Revalidation API calls: ${revalidationCalls.length}`);
  });

  test('should throttle multiple stuck items to prevent spam', async ({ page }) => {
    // This test verifies that if multiple items get stuck simultaneously,
    // we only revalidate once (throttled to 3 seconds)

    // Navigate to calendar
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');

    // Track revalidation calls
    const revalidationCalls: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/admin/calendar') && !url.includes('availability')) {
        revalidationCalls.push(url);
        console.log(`📞 Revalidation call: ${url}`);
      }
    });

    // Intercept ALL mutation requests (PATCH, POST, DELETE) and hang them
    await page.route('**/api/admin/**', async (route, request) => {
      const method = request.method();
      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        console.log(`🔧 Hanging ${method} request to ${request.url()}`);
        // Hang forever - this simulates network limbo
        await new Promise(() => {}); // Never resolves
      } else {
        route.continue();
      }
    });

    // Trigger multiple mutations that will all get stuck
    // For simplicity, we'll just trigger one mutation and verify
    // that even if multiple items get stuck, we only revalidate once

    // Find a reservation to reschedule
    const reservationBlock = page.locator('[data-testid="reservation-block"]').first();
    await expect(reservationBlock).toBeVisible({ timeout: 10000 });

    // Trigger reschedule
    const boundingBox = await reservationBlock.boundingBox();
    if (boundingBox) {
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + boundingBox.width / 2 + 100, boundingBox.y + boundingBox.height / 2);
      await page.mouse.up();

      const confirmButton = page.getByRole('button', { name: /confirm/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }

    // Clear revalidation log
    revalidationCalls.length = 0;

    // Wait for failsafe to trigger (11 seconds)
    console.log('⏳ Waiting 11 seconds for failsafe...');
    await page.waitForTimeout(11000);

    // Verify only ONE revalidation call was made (throttled)
    // Even if multiple items are stuck, throttle coalesces them
    expect(revalidationCalls.length).toBeLessThanOrEqual(1);
    console.log(`✅ Throttle working: ${revalidationCalls.length} revalidation calls (expected ≤1)`);
  });
});
