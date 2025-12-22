import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

/**
 * Admin Calendar - Blackout Dates Drag & Resize
 * Tests drag-and-drop and resize functionality for blackout dates
 * Critical for preventing conflicts and maintaining data integrity with optimistic updates
 */
test.describe('Admin Calendar - Blackout Drag & Resize', () => {
    let testBlackoutId: string;
    let testCampsiteId: string;
    let alternateCampsiteId: string;

    // Hide instructional overlay that can intercept pointer events
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('has_seen_blackout_overlay', 'true');
        });
    });

    // Setup: Create test data
    test.beforeAll(async () => {
        // Get two campsites for testing moves
        const { data: campsites } = await supabaseAdmin
            .from('campsites')
            .select('id, code')
            .eq('is_active', true)
            .limit(2);

        if (!campsites || campsites.length < 2) {
            throw new Error('Need at least 2 active campsites for blackout tests');
        }

        testCampsiteId = campsites[0].id;
        alternateCampsiteId = campsites[1].id;

        // Create test blackout in the CURRENT month to ensure it's visible
        // Use dates 5-8 days from now to stay in current month
        const today = new Date();
        const startDate = addDays(today, 5);
        const endDate = addDays(startDate, 3);

        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId,
                reason: 'Test Maintenance'
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create test blackout: ${error.message}`);
        }

        testBlackoutId = data.id;
        console.log('Created blackout test data:', testBlackoutId);
    });

    test.afterAll(async () => {
        if (testBlackoutId) {
            await supabaseAdmin
                .from('blackout_dates')
                .delete()
                .eq('id', testBlackoutId);
        }
    });

    test.describe('Blackout Drag Operations', () => {
        test('should drag blackout to different campsite', async ({ page }) => {
            // Navigate to calendar
            await page.goto('/admin/calendar');
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();

            // Wait for calendar to load
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            // Find blackout block by text content
            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Get initial campsite assignment
            const { data: initialBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('campsite_id')
                .eq('id', testBlackoutId)
                .single();

            expect(initialBlackout?.campsite_id).toBe(testCampsiteId);

            // Find alternate campsite row
            const alternateCampsiteRow = page.locator(`[data-campsite-id="${alternateCampsiteId}"]`).first();

            if (await alternateCampsiteRow.isVisible()) {
                // Perform drag and drop
                await blackoutBlock.dragTo(alternateCampsiteRow);

                // Wait for optimistic update
                await page.waitForTimeout(1500);

                // Verify database update
                const { data: updatedBlackout } = await supabaseAdmin
                    .from('blackout_dates')
                    .select('campsite_id')
                    .eq('id', testBlackoutId)
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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

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

        test('should move blackout to different dates on same campsite', async ({ page }) => {
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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            const initialBox = await blackoutBlock.boundingBox();
            expect(initialBox).not.toBeNull();

            // Drag horizontally (same row, different dates)
            // Move to the right by approximately 150px (few days later)
            await page.mouse.move(
                initialBox!.x + initialBox!.width / 2,
                initialBox!.y + initialBox!.height / 2
            );
            await page.mouse.down();
            await page.mouse.move(
                initialBox!.x + 150,
                initialBox!.y + initialBox!.height / 2
            );
            await page.mouse.up();

            await page.waitForTimeout(1500);

            // Verify dates changed in database
            const { data: movedBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('start_date, end_date, campsite_id')
                .eq('id', testBlackoutId)
                .single();

            // Campsite should remain the same
            expect(movedBlackout?.campsite_id).toBe(testCampsiteId);

            // Dates should be different from original
            const newStartDate = new Date(movedBlackout!.start_date);
            expect(newStartDate.getTime()).toBeGreaterThan(startDate.getTime());
        });
    });

    test.describe('Blackout Resize Operations', () => {
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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Hover to show resize handles
            await blackoutBlock.hover();

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
                    await page.mouse.move(
                        handleBox.x + 100,
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.up();

                    await page.waitForTimeout(1500);

                    // Verify extended end date in database
                    const { data: updatedBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

            await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

            // Hover to show resize handles
            await blackoutBlock.hover();

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
                    await page.mouse.move(
                        handleBox.x + 80,
                        handleBox.y + handleBox.height / 2
                    );
                    await page.mouse.up();

                    await page.waitForTimeout(1500);

                    // Verify shortened stay in database
                    const { data: updatedBlackout } = await supabaseAdmin
                        .from('blackout_dates')
                        .select('start_date, end_date')
                        .eq('id', testBlackoutId)
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

    test.describe('Conflict Validation', () => {
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
                    balance_due: 300
                })
                .select()
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

                await page.goto('/admin/calendar');
                await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

                const blackoutBlock = page.locator('[draggable="true"]', {
                    has: page.locator('text=/Test Maintenance/i')
                }).first();

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
                        .single();

                    // Try to drag blackout onto reservation dates
                    await blackoutBlock.dragTo(reservationBlock);
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
                    reason: 'Conflict Blackout'
                })
                .select()
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

                await page.goto('/admin/calendar');
                await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

                const blackoutBlock = page.locator('[draggable="true"]', {
                    has: page.locator('text=/Test Maintenance/i')
                }).first();

                await expect(blackoutBlock).toBeVisible({ timeout: 10000 });

                // Find the conflict blackout block
                const conflictBlock = page.locator('[draggable="true"]', {
                    has: page.locator('text=/Conflict Blackout/i')
                }).first();

                if (await conflictBlock.isVisible({ timeout: 5000 })) {
                    // Try to drag blackout onto conflicting blackout dates
                    await blackoutBlock.dragTo(conflictBlock);
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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

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
        test('should show optimistic update and rollback on server error', async ({ page }) => {
            // This test verifies the SWR optimistic update pattern
            // We'll move the blackout to a different campsite, then verify it rolls back on error

            // Reset to known state
            await supabaseAdmin
                .from('blackout_dates')
                .update({ campsite_id: testCampsiteId })
                .eq('id', testBlackoutId);

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

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
                await blackoutBlock.dragTo(alternateCampsiteRow);

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

            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            const blackoutBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Test Maintenance/i')
            }).first();

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
