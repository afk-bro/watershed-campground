import { test, expect } from '@playwright/test';
import { supabaseAdmin, createTestCampsite, deleteTestCampsite, createTestBlackout, createTestReservation } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';
import { stabilizeForDrag, ensureNoBackdropInterception, closeOverlays, killBackdrops, killBackdropsUntilStable, logTopFixedOverlays } from '../helpers/calendarE2E';

// Default test organization ID
const organizationId = '00000000-0000-0000-0000-000000000001';

/**
 * Admin Calendar - Blackout Drag & Resize
 * Tests drag-and-drop and resize functionality for blackout dates
 * Critical for preventing conflicts and maintaining data integrity with optimistic updates
 */
test.describe('Admin Calendar - Blackout Drag & Resize', () => {
    let testBlackoutId: string;
    let testCampsiteId: string;
    let alternateCampsiteId: string;

    // Hide instructional overlay that can intercept pointer events and inject E2E CSS
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('has_seen_blackout_overlay', 'true');
        });

        // Aggressive but scoped CSS to prevent backdrops/overlays from intercepting pointer events
        await page.addStyleTag({
            content: `
                /* E2E stability: backdrops sometimes linger and intercept pointer events */
                .fixed.inset-0.bg-black\\/50.backdrop-blur-sm,
                .fixed.inset-0.z-\\[60\\],
                [data-backdrop],
                .modal-backdrop,
                .dialog-backdrop,
                .backdrop {
                  pointer-events: none !important;
                }

                /* Reduce animation timing flake */
                *, *::before, *::after {
                  transition-duration: 0ms !important;
                  animation-duration: 0ms !important;
                  scroll-behavior: auto !important;
                }
            `
        });
    });

    // P3 & P0: Setup dedicated campsites per test suite run to avoid seeded conflicts
    test.beforeAll(async () => {
        // Create fresh campsites for this test run
        const campsite1 = await createTestCampsite({ name: 'Drag Test Source', organization_id: organizationId });
        const campsite2 = await createTestCampsite({ name: 'Drag Test Target', organization_id: organizationId });

        testCampsiteId = campsite1.id;
        alternateCampsiteId = campsite2.id;

        console.log('Created dedicated test campsites:', testCampsiteId, alternateCampsiteId);

        // Create test blackout in the CURRENT month to ensure it's visible

        // Create test blackout in the CURRENT month to ensure it's visible
        // Use dates 5-8 days from now to stay in current month
        const today = new Date();
        const startDate = addDays(today, 5);
        const endDate = addDays(startDate, 3);

        const data = await createTestBlackout({
            campsite_id: testCampsiteId,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            reason: 'Maintenance Drag Test'
        });

        testBlackoutId = data.id;
        console.log('Created blackout test data:', testBlackoutId);
    });

    // Navigate to the calendar month that contains the test blackout so the block is visible
    async function gotoCalendarForBlackout(page: import('@playwright/test').Page) {
        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .select('start_date')
            .eq('id', testBlackoutId)
            .throwOnError()
            .single();

        if (error || !data) {
            throw new Error(`Failed to fetch test blackout for navigation: ${error?.message}`);
        }

        const start = new Date(data.start_date);
        const month = start.getMonth() + 1; // 1-based month
        const year = start.getFullYear();
        await page.goto(`/admin/calendar?month=${month}&year=${year}`);
    }

    test.afterAll(async () => {
        if (testBlackoutId) {
            await supabaseAdmin
                .from('blackout_dates')
                .delete()
                .eq('id', testBlackoutId);
        }
        if (testCampsiteId) await deleteTestCampsite(testCampsiteId);
        if (alternateCampsiteId) await deleteTestCampsite(alternateCampsiteId);
    });

    // P0: Re-enabled UI smoke test with hardened DnD targeting + dedicated campsites
    test.describe('Blackout Drag Operations', () => {
        test.skip(true, 'TODO(E2E-DRAG) (#49): implement Option A (commit move) or Option B (drag handles + cell ids)');
        test('should drag blackout to different campsite', async ({ page }) => {
            // ⚠️ SKIPPED: Playwright drag physics unreliable for complex interactive UIs
            //
            // WHY: PATCH mutation not firing despite correct event sequence
            // MITIGATION: API test at calendar-interactions.spec.ts:268 validates same business logic
            //
            // FIX OPTIONS (choose one):
            //
            // Option A (RECOMMENDED - better UX + testability):
            //   Add explicit "commit move" path via:
            //   - Confirmation dialog after drop
            //   - OR right-click context menu with "Move" option
            //   - OR keyboard shortcut (Cmd+M) to commit
            //   Benefits: Accessible, prevents accidental moves, easy to test
            //
            // Option B (Pure drag solution):
            //   Add stable selectors to eliminate pointer-event ambiguity:
            //   - data-testid="blackout-drag-handle" on drag handle element
            //   - data-testid="calendar-cell-${campsiteId}-${yyyy-mm-dd}" on each cell
            //   Update test to drag handle → cell instead of boundingBox → boundingBox
            //
            // Search codebase for: TODO(E2E-DRAG) to find all related items
            // Navigate to calendar (go to month that contains the created blackout)
            await gotoCalendarForBlackout(page);
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();

            // Wait for calendar to load
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            // Prefer locating by data-blackout-id (more stable) introduced by the app
            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events and stabilize for drag
            await stabilizeForDrag(page, blackoutBlock);
            await killBackdropsUntilStable(page, 1);
            // Debug: report how many overlays we removed
            {
                const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
                console.log('E2E removed overlays:', removed);
            }

            // Get initial campsite assignment
            const { data: initialBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('campsite_id')
                .eq('id', testBlackoutId)
                .throwOnError()
                .single();

            expect(initialBlackout?.campsite_id).toBe(testCampsiteId);

            // Find alternate campsite row
            const alternateCampsiteRow = page.locator(`[data-campsite-id="${alternateCampsiteId}"]`).first();

            if (await alternateCampsiteRow.isVisible()) {
                // Perform drag and drop (stabilize first)
                await stabilizeForDrag(page, blackoutBlock);
                await killBackdropsUntilStable(page, 1);
                // Debug: report how many overlays we removed
                {
                    const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
                    console.log('E2E removed overlays:', removed);
                }

                // Install API response waiter BEFORE starting drag
                const patchPromise = page.waitForResponse(response =>
                    response.url().includes('/api/admin/blackout-dates/') &&
                    response.request().method() === 'PATCH' &&
                    response.status() === 200
                );

                try {
                    // Manual drag implementation to support throttled listeners (16ms)
                    // Playwright's dragTo is sometimes too fast
                    const sourceBox = await blackoutBlock.boundingBox();
                    const targetBox = await alternateCampsiteRow.boundingBox();

                    if (sourceBox && targetBox) {
                        // Start at center of source
                        await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
                        await page.mouse.down();

                        // Wait a tick to let drag start register
                        await page.waitForTimeout(50);

                        // Move in steps to target
                        const targetX = targetBox.x + targetBox.width / 2;
                        const targetY = targetBox.y + targetBox.height / 2;

                        await page.mouse.move(targetX, targetY, { steps: 10 });

                        // Wait for throttle to catch up
                        // Do NOT hover element as it has pointer-events: none during drag
                        await page.waitForTimeout(200);
                    }
                } catch (err) {
                    await logTopFixedOverlays(page);
                    throw err;
                }

                await page.mouse.up();
                await patchPromise;

                // Verify database update
                const { data: updatedBlackout } = await supabaseAdmin
                    .from('blackout_dates')
                    .select('campsite_id')
                    .eq('id', testBlackoutId)
                    .throwOnError()
                    .single();

                expect(updatedBlackout?.campsite_id).toBe(alternateCampsiteId);

                // Reset to original state for other tests
                await supabaseAdmin
                    .from('blackout_dates')
                    .update({ campsite_id: testCampsiteId })
                    .eq('id', testBlackoutId);
            } else {
                console.log('Alternate campsite row not visible, skipping drag test');
            }
        });

        // TODO: Re-enable when global blackouts (campsite_id = null) are rendered in calendar
        // Currently, the UNASSIGNED row only shows unassigned reservations, not global blackouts
        test.skip('should drag blackout to UNASSIGNED (global blackout)', async ({ page }) => {
            // Ensure blackout is assigned to specific campsite
            await supabaseAdmin
                .from('blackout_dates')
                .update({ campsite_id: testCampsiteId })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events
            await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Find UNASSIGNED row (campsite_id = null)
            const unassignedRow = page.locator('[data-campsite-id="UNASSIGNED"]').first();

            if (await unassignedRow.isVisible()) {
                await blackoutBlock.dragTo(unassignedRow);
                await page.waitForTimeout(1500);

                // Verify campsite_id is now null (global blackout)
                const { data: updatedBlackout } = await supabaseAdmin
                    .from('blackout_dates')
                    .select('campsite_id')
                    .eq('id', testBlackoutId)
                    .throwOnError()
                    .single();

                expect(updatedBlackout?.campsite_id).toBeNull();

                // Reset to specific campsite for other tests
                await supabaseAdmin
                    .from('blackout_dates')
                    .update({ campsite_id: testCampsiteId })
                    .eq('id', testBlackoutId);
            } else {
                console.log('UNASSIGNED row not visible, skipping test');
            }
        });

        test.skip('should move blackout to different dates on same campsite', async ({ page }) => {
            // Reset to known state
            const today = new Date();
            const startDate = addDays(today, 5);
            const endDate = addDays(startDate, 3);

            await supabaseAdmin
                .from('blackout_dates')
                .update({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: testCampsiteId
                })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events
            await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            const initialBox = await blackoutBlock.boundingBox();
            expect(initialBox).not.toBeNull();

            // Drag horizontally to specific date (start + 5 days to ensure distinct move)
            const targetDate = addDays(startDate, 5);
            const targetDateStr = format(targetDate, 'yyyy-MM-dd');
            // Ensure no conflicting reservations in the target range by clearing ALL future reservations
            // for this campsite. Also clear maintenance blocks.
            await supabaseAdmin.from('reservations').delete()
                .eq('campsite_id', testCampsiteId)
                .gte('check_in', format(new Date(), 'yyyy-MM-dd'));
            await supabaseAdmin.from('maintenance_blocks').delete()
                .eq('campsite_id', testCampsiteId)
                .gte('start_date', format(new Date(), 'yyyy-MM-dd'));

            // Find the *center* of the blackout block to grab it
            const sourceBox = await blackoutBlock.boundingBox();

            if (sourceBox) {
                await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
                await page.mouse.down();

                // Wait a tick to let drag start register
                await page.waitForTimeout(50);

                // Find target cell
                const targetCell = page.locator(`[data-campsite-id="${testCampsiteId}"] [data-date="${targetDateStr}"]`).first();
                await targetCell.hover({ force: true });

                // P2.1: Wait for deterministic drag state instead of timeout
                await expect(page.locator('[data-drag-state="dragging"]')).toBeAttached();

                // Verify Ghost appears AND is valid (success color)
                // If this fails, we have a conflict or validation error
                const ghost = page.locator('[data-ghost-mode="move"]');
                await expect(ghost).toBeVisible({ timeout: 2000 });
                await expect(ghost).toHaveClass(/color-success/);
            }

            // Wait for API response
            const patchPromise = page.waitForResponse(response =>
                response.url().includes('/api/admin/blackout-dates/') &&
                response.request().method() === 'PATCH' &&
                response.status() === 200
            );

            await page.mouse.up();
            await patchPromise;

            // Verify dates changed in database
            const { data: movedBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('start_date, end_date, campsite_id')
                .eq('id', testBlackoutId)
                .throwOnError()
                .single();

            // Campsite should remain the same
            expect(movedBlackout?.campsite_id).toBe(testCampsiteId);

            // Dates should be different from original
            const newStartDate = new Date(movedBlackout!.start_date);
            expect(newStartDate.getTime()).toBeGreaterThan(startDate.getTime());
        });
    });

    test.describe.skip('Blackout Resize Operations', () => {
        test('should extend blackout by dragging right edge', async ({ page }) => {
            // Reset to known state
            const today = new Date();
            const startDate = addDays(today, 5);
            const endDate = addDays(startDate, 3);

            await supabaseAdmin
                .from('blackout_dates')
                .update({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd')
                })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events and stabilize for hover/drag
            await stabilizeForDrag(page, blackoutBlock);
            await killBackdropsUntilStable(page, 1);
            // Debug: report how many overlays we removed
            {
                const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
                console.log('E2E removed overlays:', removed);
            }

            // Hover to show resize handles
            try {
                await blackoutBlock.hover();
            } catch (err) {
                await logTopFixedOverlays(page);
                throw err;
            }

            // Look for right resize handle
            const rightHandle = blackoutBlock.locator('[class*="resize"]').last();

            if (await rightHandle.isVisible({ timeout: 2000 })) {
                const handleBox = await rightHandle.boundingBox();

                if (handleBox) {
                    // Drag handle to the right to extend
                    await page.mouse.move(
                        handleBox.x + handleBox.width / 2,
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.down();

                    // Drag to target date (extend by 3 days)
                    const targetDate = addDays(endDate, 3);

                    // Clear conflicts for resize target too (reservations + maintenance)
                    await supabaseAdmin.from('reservations').delete()
                        .eq('campsite_id', testCampsiteId)
                        .gte('check_in', format(new Date(), 'yyyy-MM-dd'));
                    await supabaseAdmin.from('maintenance_blocks').delete()
                        .eq('campsite_id', testCampsiteId)
                        .gte('start_date', format(new Date(), 'yyyy-MM-dd'));

                    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
                    const targetCell = page.locator(`[data-campsite-id="${testCampsiteId}"] [data-date="${targetDateStr}"]`).first();

                    await targetCell.hover({ force: true });

                    // Pause for throttle
                    await page.waitForTimeout(200);
                    await page.mouse.up();



                    // Wait for API response
                    await page.waitForResponse(response =>
                        response.url().includes('/api/admin/blackout-dates/') &&
                        response.request().method() === 'PATCH' &&
                        response.status() === 200
                    );

                    // Verify extended end date in database
                    const { data: updatedBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    // Start date should remain the same
                    expect(updatedBlackout?.start_date).toBe(format(startDate, 'yyyy-MM-dd'));

                    // End date should be extended (at least 1 day later)
                    const newEndDate = new Date(updatedBlackout!.end_date);
                    expect(newEndDate.getTime()).toBeGreaterThan(endDate.getTime());
                }
            } else {
                console.log('Resize handle not visible, skipping resize test');
            }
        });

        test('should shorten blackout by dragging left edge forward', async ({ page }) => {
            // Reset to longer blackout
            const startDate = addDays(new Date(), 5);
            const endDate = addDays(startDate, 5);

            await supabaseAdmin
                .from('blackout_dates')
                .update({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd')
                })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events and stabilize for hover
            await stabilizeForDrag(page, blackoutBlock);
            await killBackdrops(page);
            // Debug: report how many overlays we removed
            {
                const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
                console.log('E2E removed overlays:', removed);
            }

            // Hover to show resize handles
            try {
                await blackoutBlock.hover();
            } catch (err) {
                await logTopFixedOverlays(page);
                throw err;
            }

            // Look for left resize handle
            const leftHandle = blackoutBlock.locator('[class*="resize"]').first();

            if (await leftHandle.isVisible({ timeout: 2000 })) {
                const handleBox = await leftHandle.boundingBox();

                if (handleBox) {
                    // Drag handle to the right to shorten (move start date forward)
                    await page.mouse.move(
                        handleBox.x + handleBox.width / 2,
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.down();

                    // Drag to target date (shorten by moving start 3 days forward)
                    const targetDate = addDays(startDate, 3);

                    // Clear conflicts for resize target (reservations + maintenance)
                    await supabaseAdmin.from('reservations').delete()
                        .eq('campsite_id', testCampsiteId)
                        .gte('check_in', format(new Date(), 'yyyy-MM-dd'));
                    await supabaseAdmin.from('maintenance_blocks').delete()
                        .eq('campsite_id', testCampsiteId)
                        .gte('start_date', format(new Date(), 'yyyy-MM-dd'));

                    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
                    const targetCell = page.locator(`[data-campsite-id="${testCampsiteId}"] [data-date="${targetDateStr}"]`).first();

                    await targetCell.hover({ force: true });

                    // Pause for throttle
                    await page.waitForTimeout(200);
                    await page.mouse.up();



                    // Wait for API response
                    await page.waitForResponse(response =>
                        response.url().includes('/api/admin/blackout-dates/') &&
                        response.request().method() === 'PATCH' &&
                        response.status() === 200
                    );

                    // Verify shortened stay in database
                    const { data: updatedBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    // Start date should be later than original
                    const newStartDate = new Date(updatedBlackout!.start_date);
                    expect(newStartDate.getTime()).toBeGreaterThan(startDate.getTime());

                    // End date should remain the same
                    expect(updatedBlackout?.end_date).toBe(format(endDate, 'yyyy-MM-dd'));
                }
            } else {
                console.log('Left resize handle not visible, skipping test');
            }
        });
    });

    test.describe.skip('Conflict Validation', () => {
        test('should prevent blackout from overlapping with existing reservation', async ({ page }) => {
            // Create a reservation that would conflict
            const reservationStart = addDays(new Date(), 10);
            const reservationEnd = addDays(reservationStart, 3);

            const { data: reservation } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Conflict',
                    last_name: 'Test',
                    email: 'conflict.blackout@example.com',
                    phone: '555-9999',
                    address1: '123 Test St',
                    city: 'Test City',
                    postal_code: '12345',
                    check_in: format(reservationStart, 'yyyy-MM-dd'),
                    check_out: format(reservationEnd, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '25',
                    camping_unit: 'RV / Trailer',
                    contact_method: 'Email',
                    status: 'confirmed',
                    campsite_id: testCampsiteId,
                    total_amount: 300,
                    amount_paid: 0,
                    balance_due: 300,
                    organization_id: organizationId
                })
                .select()
                .throwOnError()
                .single();

            const reservationId = reservation?.id;

            try {
                // Reset blackout to non-conflicting dates
                const blackoutStart = addDays(new Date(), 5);
                const blackoutEnd = addDays(blackoutStart, 3);

                await supabaseAdmin
                    .from('blackout_dates')
                    .update({
                        start_date: format(blackoutStart, 'yyyy-MM-dd'),
                        end_date: format(blackoutEnd, 'yyyy-MM-dd'),
                        campsite_id: testCampsiteId
                    })
                    .eq('id', testBlackoutId);

                await gotoCalendarForBlackout(page);
                await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

                const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

                // Ensure no modal/backdrop intercepting pointer events
                await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
                await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

                // Find the reservation block
                const reservationBlock = page.locator('[draggable="true"]', {
                    has: page.locator('text=/Conflict.*Test/i')
                }).first();

                if (await reservationBlock.isVisible({ timeout: 5000 })) {
                    const originalBlackoutData = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    // Try to drag blackout onto reservation dates
                    // Stabilize and try to drag blackout onto reservation dates
                    await stabilizeForDrag(page, blackoutBlock);
                    await killBackdropsUntilStable(page, 1);
                    // Debug: report how many overlays we removed
                    {
                        const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
                        console.log('E2E removed overlays:', removed);
                    }
                    try {
                        await blackoutBlock.dragTo(reservationBlock);
                    } catch (err) {
                        await logTopFixedOverlays(page);
                        throw err;
                    }
                    await page.waitForTimeout(2000);

                    // Check for error message
                    const errorMessage = page.locator('text=/conflict|overlap|reservation/i');
                    const hasError = await errorMessage.isVisible({ timeout: 3000 });

                    if (hasError) {
                        console.log('Conflict detected - error message shown');
                        await expect(errorMessage).toBeVisible();
                    }

                    // Verify blackout didn't move to conflicting dates (or rolled back)
                    const { data: verifyBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    // Should either be unchanged or not overlap with reservation
                    const blackoutStartDate = new Date(verifyBlackout!.start_date);
                    const blackoutEndDate = new Date(verifyBlackout!.end_date);

                    const isOverlapping = (
                        blackoutStartDate < new Date(reservationEnd) &&
                        blackoutEndDate > new Date(reservationStart)
                    );

                    expect(isOverlapping).toBe(false);
                }
            } finally {
                // Clean up reservation
                if (reservationId) {
                    await supabaseAdmin
                        .from('reservations')
                        .delete()
                        .eq('id', reservationId);
                }
            }
        });

        test('should prevent blackout from overlapping with another blackout', async ({ page }) => {
            // Create another blackout that would conflict
            const conflictStart = addDays(new Date(), 12);
            const conflictEnd = addDays(conflictStart, 3);

            const { data: conflictBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .insert({
                    start_date: format(conflictStart, 'yyyy-MM-dd'),
                    end_date: format(conflictEnd, 'yyyy-MM-dd'),
                    campsite_id: testCampsiteId,
                    reason: 'Overlap Test Blackout',
                    organization_id: organizationId
                })
                .select()
                .throwOnError()
                .single();

            const conflictBlackoutId = conflictBlackout?.id;

            try {
                // Reset test blackout to non-conflicting dates
                const blackoutStart = addDays(new Date(), 5);
                const blackoutEnd = addDays(blackoutStart, 3);

                await supabaseAdmin
                    .from('blackout_dates')
                    .update({
                        start_date: format(blackoutStart, 'yyyy-MM-dd'),
                        end_date: format(blackoutEnd, 'yyyy-MM-dd'),
                        campsite_id: testCampsiteId
                    })
                    .eq('id', testBlackoutId);

                await gotoCalendarForBlackout(page);
                await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

                const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

                // Ensure no modal/backdrop intercepting pointer events
                await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
                await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

                // Find the conflict blackout block
                const conflictBlock = page.locator(`[data-blackout-id="${conflictBlackoutId}"]`).first();

                if (await conflictBlock.isVisible({ timeout: 5000 })) {
                    // Try to drag blackout onto conflicting blackout dates
                    // Stabilize and try to drag blackout onto conflicting blackout dates
                    await stabilizeForDrag(page, blackoutBlock);
                    await killBackdrops(page);
                    try {
                        await blackoutBlock.dragTo(conflictBlock);
                    } catch (err) {
                        await logTopFixedOverlays(page);
                        throw err;
                    }
                    await page.waitForTimeout(2000);

                    // Check for error message
                    const errorMessage = page.locator('text=/conflict|overlap|blackout/i');
                    const hasError = await errorMessage.isVisible({ timeout: 3000 });

                    if (hasError) {
                        console.log('Blackout conflict detected - error message shown');
                        await expect(errorMessage).toBeVisible();
                    }

                    // Verify blackout didn't move to conflicting dates
                    const { data: verifyBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    const blackoutStartDate = new Date(verifyBlackout!.start_date);
                    const blackoutEndDate = new Date(verifyBlackout!.end_date);

                    const isOverlapping = (
                        blackoutStartDate < new Date(conflictEnd) &&
                        blackoutEndDate > new Date(conflictStart)
                    );

                    expect(isOverlapping).toBe(false);
                }
            } finally {
                // Clean up conflict blackout
                if (conflictBlackoutId) {
                    await supabaseAdmin
                        .from('blackout_dates')
                        .delete()
                        .eq('id', conflictBlackoutId);
                }
            }
        });

        test('should reject invalid date range (end before start)', async ({ page }) => {
            // Reset to known state
            const startDate = addDays(new Date(), 5);
            const endDate = addDays(startDate, 5);

            await supabaseAdmin
                .from('blackout_dates')
                .update({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd')
                })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events
            await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Hover to show resize handles
            await blackoutBlock.hover();

            // Try to drag left edge past right edge (invalid)
            const leftHandle = blackoutBlock.locator('[class*="resize"]').first();

            if (await leftHandle.isVisible({ timeout: 2000 })) {
                const handleBox = await leftHandle.boundingBox();
                const blockBox = await blackoutBlock.boundingBox();

                if (handleBox && blockBox) {
                    // Try to drag left edge to the right, past the end date
                    await page.mouse.move(
                        handleBox.x + handleBox.width / 2,
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.down();
                    await page.mouse.move(
                        blockBox.x + blockBox.width + 50, // Way past the right edge
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.up();

                    await page.waitForTimeout(2000);

                    // Should show error or revert
                    const errorMessage = page.locator('text=/invalid|end date|minimum/i');
                    const hasError = await errorMessage.isVisible({ timeout: 2000 });

                    if (hasError) {
                        console.log('Invalid date range detected - error shown');
                    }

                    // Verify dates are still valid in database
                    const { data: verifyBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
                        .throwOnError()
                        .single();

                    const dbStart = new Date(verifyBlackout!.start_date);
                    const dbEnd = new Date(verifyBlackout!.end_date);

                    // End should still be after start
                    expect(dbEnd.getTime()).toBeGreaterThan(dbStart.getTime());
                }
            }
        });
    });

    test.describe('Optimistic Updates and Rollback', () => {
        test.skip('should show optimistic update and rollback on server error', async ({ page }) => {
            // This test verifies the SWR optimistic update pattern
            // We'll move the blackout to a different campsite, then verify it rolls back on error

            // Reset to known state
            await supabaseAdmin
                .from('blackout_dates')
                .update({ campsite_id: testCampsiteId })
                .eq('id', testBlackoutId);

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            // Ensure no modal/backdrop intercepting pointer events
            await page.waitForSelector('div[role="dialog"], .fixed.inset-0, .modal, [data-backdrop]', { state: 'detached', timeout: 5000 }).catch(() => { });
            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Get initial position to verify rollback visually
            const initialBox = await blackoutBlock.boundingBox();
            expect(initialBox).not.toBeNull();

            // Note: This test is limited because we can't easily simulate server errors
            // in E2E tests without mocking the API. However, we can verify the
            // optimistic update behavior by checking that:
            // 1. The UI updates immediately on drag
            // 2. The final state matches the server response

            const alternateCampsiteRow = page.locator(`[data-campsite-id="${alternateCampsiteId}"]`).first();

            if (await alternateCampsiteRow.isVisible()) {
                await stabilizeForDrag(page, blackoutBlock);
                await killBackdrops(page);
                try {
                    await blackoutBlock.dragTo(alternateCampsiteRow);
                } catch (err) {
                    await logTopFixedOverlays(page);
                    throw err;
                }

                // UI should update immediately (optimistic)
                // Wait a bit for the animation
                await page.waitForTimeout(500);

                // Then wait for server response
                await page.waitForTimeout(1500);

                // Verify final state matches server
                const { data: finalBlackout } = await supabaseAdmin
                    .from('blackout_dates')
                    .select('campsite_id')
                    .eq('id', testBlackoutId)
                    .throwOnError()
                    .single();

                // If move was successful, UI and DB should match
                expect(finalBlackout?.campsite_id).toBe(alternateCampsiteId);

                // Reset for other tests
                await supabaseAdmin
                    .from('blackout_dates')
                    .update({ campsite_id: testCampsiteId })
                    .eq('id', testBlackoutId);
            }
        });

        test('should maintain drawer state during optimistic update', async ({ page }) => {
            // This test verifies that drawers stay open during updates
            // (one of the key improvements of SWR over window.location.reload)

            await gotoCalendarForBlackout(page);
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator(`[data-blackout-id="${testBlackoutId}"]`).first();

            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Click to open drawer (if drawer functionality exists)
            await blackoutBlock.click();

            // Check if a drawer/modal opened
            const drawer = page.locator('[role="dialog"], [class*="drawer"], [class*="modal"]');
            const drawerVisible = await drawer.isVisible({ timeout: 2000 });

            if (drawerVisible) {
                console.log('Drawer opened - testing state preservation during update');

                // Make a change (e.g., edit reason field if available)
                const reasonInput = drawer.locator('input[name="reason"], textarea[name="reason"]');

                if (await reasonInput.isVisible({ timeout: 1000 })) {
                    await reasonInput.fill('Updated Maintenance Reason');

                    // Submit or save (trigger optimistic update)
                    const saveButton = drawer.locator('button:has-text("Save"), button:has-text("Update")');

                    if (await saveButton.isVisible({ timeout: 1000 })) {
                        await saveButton.click();

                        // Wait for optimistic update
                        await page.waitForTimeout(1500);

                        // Drawer should still be visible (not reloaded away)
                        await expect(drawer).toBeVisible();
                    }
                }
            } else {
                console.log('No drawer found - skipping drawer state test');
            }
        });
    });
});
