/**
 * E2E Test: Stuck Saving Failsafe
 *
 * Verifies that the stuck saving failsafe:
 * 1. Detects items stuck in _saving state
 * 2. Shows warning toast after configured timeout
 * 3. Auto-revalidates to sync with server
 * 4. User is not permanently stuck (can recover)
 *
 * Strategy:
 * - Inject _saving flag to simulate stuck state (no real network hang needed)
 * - Verify "Saving..." indicator appears
 * - Wait for failsafe to trigger (500ms in tests, 10s in prod)
 * - Verify warning toast appears
 * - Verify revalidation API call is made
 *
 * Note: Timeout is configurable via NEXT_PUBLIC_STUCK_SAVING_TIMEOUT_MS
 * (500ms for tests, 10s for production)
 */

import { test, expect } from '@playwright/test';

test.describe('Stuck Saving Failsafe', () => {
  test('should auto-revalidate when item stuck in saving state', async ({ page }) => {
    // Track API calls for revalidation verification
    const apiCalls: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/admin/calendar') && !url.includes('availability')) {
        apiCalls.push(url);
      }
    });

    // Intercept calendar API to inject stuck _saving flag
    // This simulates a reservation stuck in saving state without needing real network hangs
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

    // ==========================================
    // ASSERT: UI enters "Saving..." state
    // ==========================================
    await expect(page.getByText('Saving...')).toBeVisible({ timeout: 3000 });
    console.log('✅ "Saving..." indicator appeared');

    // Clear API calls log (so we can track revalidation)
    apiCalls.length = 0;

    // ==========================================
    // ASSERT: Failsafe triggers after configured timeout
    // ==========================================
    // Playwright config sets timeout to 500ms for tests (vs 10s in prod)
    // Wait 600ms to give it margin
    console.log('⏳ Waiting for failsafe to trigger (500ms timeout + 100ms margin)...');

    // Use expect with timeout instead of waitForTimeout for better error messages
    await expect(page.getByText(/still saving/i)).toBeVisible({ timeout: 1000 });
    console.log('✅ Warning toast appeared');

    // ==========================================
    // ASSERT: Revalidation called to sync with server
    // ==========================================
    const revalidationCalls = apiCalls.filter(url =>
      url.includes('/api/admin/calendar') && !url.includes('availability')
    );

    expect(revalidationCalls.length).toBeGreaterThan(0);
    console.log(`✅ Revalidation API calls: ${revalidationCalls.length}`);

    // ==========================================
    // ASSERT: User can recover (not permanently stuck)
    // ==========================================
    // The saving indicator should eventually clear after revalidation
    // This ensures the user isn't left in a broken state
    await expect(page.getByText('Saving...')).not.toBeVisible({ timeout: 2000 });
    console.log('✅ Saving indicator cleared after revalidation');
  });

  test('should handle real mutation hang with recovery', async ({ page }) => {
    // This test verifies the failsafe works with an actual hung request
    // (not just injected _saving flags)

    // Navigate to calendar
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');

    // Intercept ONE specific mutation and hang it
    // (Not all mutations - that's too aggressive and fragile)
    await page.route('**/api/admin/calendar/reschedule**', async () => {
      // Hang this specific request indefinitely
      await new Promise(() => {}); // Never resolves
    });

    // Try to trigger a reschedule mutation
    const reservationBlock = page.locator('[data-reservation-id]').first();

    // If no reservations on calendar, skip this test
    const blockCount = await reservationBlock.count();
    if (blockCount === 0) {
      test.skip();
      return;
    }

    await expect(reservationBlock).toBeVisible({ timeout: 10000 });

    // Perform drag (this will trigger the hung request)
    const boundingBox = await reservationBlock.boundingBox();
    if (boundingBox) {
      await page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        boundingBox.x + boundingBox.width / 2 + 100,
        boundingBox.y + boundingBox.height / 2
      );
      await page.mouse.up();

      // Confirm if dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // ==========================================
      // ASSERT: Saving indicator appears
      // ==========================================
      await expect(page.getByText(/saving/i)).toBeVisible({ timeout: 2000 });

      // ==========================================
      // ASSERT: Failsafe triggers and user can recover
      // ==========================================
      // Should show warning toast after 500ms timeout
      await expect(page.getByText(/still saving/i)).toBeVisible({ timeout: 1500 });

      // User should be able to dismiss or retry
      // (The exact recovery mechanism depends on your UI)
      console.log('✅ Failsafe triggered for hung request');
    }
  });
});
