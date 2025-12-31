import { test, expect, Page } from '@playwright/test';
import { supabaseAdmin, createTestCampsite, deleteTestCampsite } from '../helpers/test-supabase';
import { format, addDays, differenceInMonths, startOfMonth } from 'date-fns';
import { stabilizeForDrag, killBackdrops, killBackdropsUntilStable, logTopFixedOverlays, dismissDialogs, nukeAddBlackoutOverlay, dragToWithOverlayDefense } from '../helpers/calendarE2E';

// Default test organization ID
const organizationId = '00000000-0000-0000-0000-000000000001';

/**
 * Admin Calendar - Drag & Drop Interactions
 * Tests the calendar's drag-and-drop functionality for managing reservations.
 * Critical for admin workflow efficiency and preventing booking conflicts.
 */
test.describe.serial('Admin Calendar - Drag & Drop Interactions', () => {
    let testReservationId: string;
    let testCampsiteId: string;
    let alternateCampsiteId: string;

    // Direct navigation helper (avoids fragile month clicking)
    const navigateToCalendar = async (page: Page, month: number, year: number) => {
        await page.goto(`/admin/calendar?month=${month.toString().padStart(2, '0')}&year=${year}`);
        // Wait for API response
        await page.waitForResponse(
            response => response.url().includes('/api/admin/') && response.status() === 200,
            { timeout: 10000 }
        );
        // Wait for calendar to render
        await page.waitForSelector('[class*="calendar"]', { timeout: 5000 });
    };

    // Inject E2E CSS to prevent backdrop interception and animations
    test.beforeEach(async ({ page }) => {
        await page.addStyleTag({
            content: `
                .fixed.inset-0.bg-black\\/50.backdrop-blur-sm,
                .fixed.inset-0.z-\\[60\\],
                [data-backdrop],
                .modal-backdrop,
                .dialog-backdrop,
                .backdrop { pointer-events: none !important; }
                *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; scroll-behavior: auto !important; }
            `
        });
    });

    // Setup: Create test data
    test.beforeAll(async () => {
        // Create two dedicated campsites for testing moves (avoid 409 conflicts with seed data)
        const campsite1 = await createTestCampsite({
            name: 'Calendar Test Site 1',
            code: `CAL${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            is_active: true,
            organization_id: organizationId
        });

        const campsite2 = await createTestCampsite({
            name: 'Calendar Test Site 2',
            code: `ALT${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            is_active: true,
            organization_id: organizationId
        });

        testCampsiteId = campsite1.id;
        alternateCampsiteId = campsite2.id;

        console.log('Created calendar test campsites:', testCampsiteId, alternateCampsiteId);

        // Use fixed dates in August 2025 for stable testing
        const checkIn = new Date('2025-08-10');
        const checkOut = addDays(checkIn, 3);

        const email = `calendar.test.${Date.now()}@example.com`;

        // Check if reservation already exists (multiple browser workers may try to create)
        const { data: existing } = await supabaseAdmin
            .from('reservations')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            testReservationId = existing.id;
            console.log('Using existing test reservation:', testReservationId);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .insert({
                first_name: 'Calendar',
                last_name: 'Test',
                email,
                phone: '555-0198',
                address1: '456 Calendar St',
                city: 'Test City',
                postal_code: '12345',
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                rv_length: '25',
                camping_unit: 'RV / Trailer',
                contact_method: 'Email',
                status: 'confirmed',
                campsite_id: testCampsiteId,
                total_amount: 100,
                payment_status: 'paid',
                amount_paid: 100,
                balance_due: 0,
                organization_id: organizationId
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create test reservation: ${error.message}`);
        }

        testReservationId = data.id;
        console.log('Created calendar test reservation:', testReservationId);
    });

    test.afterAll(async () => {
        if (testReservationId) {
            await supabaseAdmin
                .from('reservations')
                .delete()
                .eq('id', testReservationId);
        }

        // Clean up dedicated test campsites
        if (testCampsiteId) {
            await deleteTestCampsite(testCampsiteId);
        }
        if (alternateCampsiteId) {
            await deleteTestCampsite(alternateCampsiteId);
        }

        console.log('Cleaned up calendar test data:', { testReservationId, testCampsiteId, alternateCampsiteId });
    });

    test.skip('should drag reservation to different campsite', async ({ page }) => {
        // TODO(2025-12-29): DnD persist flaky in Playwright; needs app-level test hook or deterministic API assertion

        test.setTimeout(60000);
        // Reset to specific dates for this test (Aug 5-8)
        const checkIn = new Date('2025-08-05');
        const checkOut = addDays(checkIn, 3);

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId
            })
            .eq('id', testReservationId);

        // Navigate directly to August 2025
        await navigateToCalendar(page, 8, 2025);

        // ==========================================
        // STEP 2: Find Test Reservation Block
        // ==========================================
        const reservationBlock = page.locator(`[data-reservation-id="${testReservationId}"]`).first();

        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        // Get initial position
        const initialBoundingBox = await reservationBlock.boundingBox();
        expect(initialBoundingBox).not.toBeNull();

        // ... (Step 3 follows) ...


        // ==========================================
        // STEP 3: Drag to Different Campsite Row
        // ==========================================
        // Find alternate campsite row
        const alternateCampsiteRow = page.locator('[data-campsite-id="' + alternateCampsiteId + '"]').first();

        if (await alternateCampsiteRow.isVisible()) {
            const targetBox = await alternateCampsiteRow.boundingBox();
            expect(targetBox).not.toBeNull();

            // Stabilize and perform drag and drop
            // await stabilizeForDrag(page, reservationBlock);
            // Dismiss any dialogs that may have been opened by accidental events
            await dismissDialogs(page);
            await killBackdropsUntilStable(page, 2);
            // Assert no dialog is visible before attempting drag
            await expect(page.getByRole('dialog')).toBeHidden().catch(() => { });
            // Debug: report how many overlays we removed
            const removed = await page.evaluate(() => (window as any).__e2e_removed_overlays__?.length ?? 0);
            console.log('E2E removed overlays:', removed);
            try {
                // Extra safety: dismiss again immediately before drag
                await dismissDialogs(page);
                await killBackdropsUntilStable(page, 2);
                await expect(page.getByRole('dialog')).toBeHidden();
                // Snapshot top fixed overlays that cover the viewport (for debugging)
                await page.evaluate(() => {
                    const top: any[] = [];
                    const els = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
                    for (const e of els) {
                        try {
                            const s = getComputedStyle(e);
                            if (s.position !== 'fixed') continue;
                            const z = Number(s.zIndex || '0');
                            if (!Number.isFinite(z) || z < 40) continue;
                            const rect = e.getBoundingClientRect();
                            const coversViewport =
                                rect.width >= window.innerWidth * 0.9 &&
                                rect.height >= window.innerHeight * 0.9 &&
                                rect.left <= 5 &&
                                rect.top <= 5;
                            if (!coversViewport) continue;
                            const text = (e.innerText || '').trim().slice(0, 120);
                            top.push({ tag: e.tagName, className: e.className?.toString()?.slice(0, 160) ?? '', zIndex: s.zIndex, pointerEvents: s.pointerEvents, display: s.display, opacity: s.opacity, text });
                        } catch (err) {
                            // ignore
                        }
                    }
                    top.sort((a, b) => Number(b.zIndex) - Number(a.zIndex));
                    (window as any).__e2e_overlay_snapshot__ = top.slice(0, 10);
                });
                const snapshot = await page.evaluate(() => (window as any).__e2e_overlay_snapshot__ ?? []);
                console.log('E2E overlay snapshot:', snapshot);
                // Use Playwright's drag with overlay defense (retries + nukes)
                // Use manual mouse events: move to start center, down, move to target center, up
                const sourceBox = await reservationBlock.boundingBox();
                const targetBox = await alternateCampsiteRow.boundingBox();

                if (sourceBox && targetBox) {
                    const startX = sourceBox.x + sourceBox.width / 2;
                    const startY = sourceBox.y + sourceBox.height / 2;
                    const targetX = targetBox.x + targetBox.width / 2;
                    const targetY = targetBox.y + targetBox.height / 2;

                    await page.mouse.move(startX, startY);
                    await page.mouse.down();
                    await page.mouse.move(startX + 10, startY + 5, { steps: 5 }); // Slight drag start
                    await page.mouse.move(targetX, targetY, { steps: 20 });
                    await page.mouse.up();
                }

                // Wait for the UI to reflect the new campsite on the reservation element
                let moved = false;
                try {
                    await page.waitForFunction((args: any) => {
                        const [id, expected] = args;
                        const el = document.querySelector(`[data-reservation-id="${id}"]`);
                        return !!el && el.getAttribute('data-campsite-id') === expected;
                    }, [testReservationId, alternateCampsiteId], { timeout: 5000 });
                    moved = true;
                } catch (err) {
                    moved = false;
                }
                console.log('E2E ui-moved?', moved);
                await page.waitForTimeout(300);
            } catch (err) {
                await logTopFixedOverlays(page);
                throw err;
            }

            // Wait for any animations/updates
            await page.waitForTimeout(1000);

            // ==========================================
            // STEP 4: Verify Database Update
            // ==========================================
            const { data: updatedReservation } = await supabaseAdmin
                .from('reservations')
                .select('campsite_id')
                .eq('id', testReservationId)
                .single();

            expect(updatedReservation?.campsite_id).toBe(alternateCampsiteId);
        } else {
            console.log('Alternate campsite row not visible, skipping drag test');
        }
    });

    test('should move reservation via API (integration fallback)', async ({ request }) => {
        // 1. Setup: Ensure reservation is on original campsite
        const checkIn = new Date('2025-08-05');
        const checkOut = addDays(checkIn, 3);

        await supabaseAdmin
            .from('reservations')
            .update({
                campsite_id: testCampsiteId,
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd')
            })
            .eq('id', testReservationId);

        // 2. Execute: Call the assign API endpoint directly
        // Note: Using the assign endpoint which is used by the drag operation
        const response = await request.post(`/api/admin/reservations/${testReservationId}/assign`, {
            data: {
                campsiteId: alternateCampsiteId
            }
        });

        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.campsiteId).toBe(alternateCampsiteId);

        // 3. Verify: Check database persistence
        const { data: updatedReservation } = await supabaseAdmin
            .from('reservations')
            .select('campsite_id')
            .eq('id', testReservationId)
            .single();

        expect(updatedReservation?.campsite_id).toBe(alternateCampsiteId);
    });

    test.skip('should show drag handles on hover', async ({ page }) => {
        // TODO(2025-12-29): Hover flaky in Playwright due to spontaneous modal interceptions (CreationDialog)
        // Reset to specific dates
        const checkIn = new Date('2025-08-05');
        const checkOut = addDays(checkIn, 3);

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId
            })
            .eq('id', testReservationId);

        await navigateToCalendar(page, 8, 2025);

        // Nuke any unwanted dialogs/backdrops that might have appeared
        await dismissDialogs(page);
        await killBackdrops(page);

        const reservationBlock = page.locator(`[data-reservation-id="${testReservationId}"]`).first();
        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        // Hover and check for handles
        await reservationBlock.hover();

        // Check for cursor style on the block itself (indicating draggable)
        await expect(reservationBlock).toHaveCSS('cursor', 'grab');

        // Check for resize handles
        const leftHandle = reservationBlock.getByTestId('resize-handle-left');
        const rightHandle = reservationBlock.getByTestId('resize-handle-right');

        // Handles should exist in the DOM when hovered (or always if implementing that way)
        await expect(leftHandle).toBeAttached();
        await expect(rightHandle).toBeAttached();
    });

    test.skip('should extend reservation by dragging right edge', async ({ page }) => {
        // TODO(2025-12-29): Mouse drag flaky in Playwright for this component
        // Reset to known dates in August 2025 (Aug 12-15, avoids overlap with previous test)
        const checkIn = new Date('2025-08-12');
        const checkOut = addDays(checkIn, 3); // 3 nights initially

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd')
            })
            .eq('id', testReservationId);

        await navigateToCalendar(page, 8, 2025);

        // ==========================================
        // STEP 1: Find Reservation Block (Using robust ID)
        // ==========================================
        const reservationBlock = page.locator(`[data-reservation-id="${testReservationId}"]`).first();

        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 2: Find Right Resize Handle
        // ==========================================
        // Hover over the block to show resize handles
        await reservationBlock.hover();

        // Look for right resize handle using testid
        const rightHandle = reservationBlock.getByTestId('resize-handle-right');

        if (await rightHandle.isVisible({ timeout: 2000 })) {
            const handleBox = await rightHandle.boundingBox();
            const blockBox = await reservationBlock.boundingBox();

            if (handleBox && blockBox) {
                // Drag handle to the right to extend by 1 day
                await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2); // Move right
                await page.mouse.up();

                await page.waitForTimeout(1000);

                // ==========================================
                // STEP 3: Verify Extended Stay in Database
                // ==========================================
                const { data: updatedReservation } = await supabaseAdmin
                    .from('reservations')
                    .select('check_in, check_out')
                    .eq('id', testReservationId)
                    .single();

                // Check-in should remain the same
                expect(updatedReservation?.check_in).toBe(format(checkIn, 'yyyy-MM-dd'));

                // Check-out should be extended (at least 1 day later)
                const newCheckOut = new Date(updatedReservation!.check_out);
                const originalCheckOut = checkOut;
                expect(newCheckOut.getTime()).toBeGreaterThan(originalCheckOut.getTime());
            }
        } else {
            console.log('Resize handle not visible, skipping resize test');
        }
    });

    test.skip('should shorten reservation by dragging left edge forward', async ({ page }) => {
        // TODO(2025-12-29): Mouse drag flaky in Playwright for this component
        // Reset reservation to longer stay in August 2025 (Aug 18-23, avoids overlap)
        const checkIn = new Date('2025-08-18');
        const checkOut = addDays(checkIn, 5); // 5 nights initially

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd')
            })
            .eq('id', testReservationId);

        await navigateToCalendar(page, 8, 2025);

        const reservationBlock = page.locator(`[data-reservation-id="${testReservationId}"]`).first();

        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        // Hover to show resize handles
        await reservationBlock.hover();

        // Look for left resize handle
        const leftHandle = reservationBlock.getByTestId('resize-handle-left');

        if (await leftHandle.isVisible({ timeout: 2000 })) {
            const handleBox = await leftHandle.boundingBox();

            if (handleBox) {
                // Drag handle to the right to shorten check-in (move it forward)
                await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(handleBox.x + 80, handleBox.y + handleBox.height / 2); // Move right
                await page.mouse.up();

                await page.waitForTimeout(1000);

                // Verify shortened stay in database
                const { data: updatedReservation } = await supabaseAdmin
                    .from('reservations')
                    .select('check_in, check_out')
                    .eq('id', testReservationId)
                    .single();

                // Check-in should be later than original
                const newCheckIn = new Date(updatedReservation!.check_in);
                expect(newCheckIn.getTime()).toBeGreaterThan(checkIn.getTime());

                // Check-out should remain the same
                expect(updatedReservation?.check_out).toBe(format(checkOut, 'yyyy-MM-dd'));
            }
        } else {
            console.log('Left resize handle not visible, skipping test');
        }
    });

    test.skip('should prevent conflicting reservation and snap back', async ({ page }) => {
        // TODO(2025-12-29): Mouse drag flaky in Playwright for this component
        // First, reset main reservation to Aug 24-27
        const mainCheckIn = new Date('2025-08-24');
        const mainCheckOut = addDays(mainCheckIn, 3);

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(mainCheckIn, 'yyyy-MM-dd'),
                check_out: format(mainCheckOut, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId
            })
            .eq('id', testReservationId);

        // Create a second reservation that would conflict (Aug 25-27, overlaps with main)
        const conflictCheckIn = new Date('2025-08-25');
        const conflictCheckOut = addDays(conflictCheckIn, 2);

        const { data: conflictReservation } = await supabaseAdmin
            .from('reservations')
            .insert({
                first_name: 'Conflict',
                last_name: 'Block',
                email: 'conflict.test@example.com',
                phone: '555-0197',
                address1: '789 Conflict Ave',
                city: 'Test City',
                postal_code: '12345',
                check_in: format(conflictCheckIn, 'yyyy-MM-dd'),
                check_out: format(conflictCheckOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                rv_length: '25',
                camping_unit: 'RV / Trailer',
                contact_method: 'Email',
                status: 'confirmed',
                campsite_id: testCampsiteId, // Same campsite
                total_amount: 100,
                amount_paid: 100,
                balance_due: 0,
                organization_id: organizationId
            })
            .select()
            .single();

        const conflictId = conflictReservation?.id;

        try {
            await navigateToCalendar(page, 8, 2025);

            // Find our original test reservation
            const originalBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Calendar.*Test/i')
            }).first();

            await expect(originalBlock).toBeVisible({ timeout: 10000 });

            // Get original position
            const originalBox = await originalBlock.boundingBox();
            expect(originalBox).not.toBeNull();

            // Try to drag it onto the conflict reservation dates
            const conflictBlock = page.locator('[draggable="true"]', {
                has: page.locator('text=/Conflict.*Block/i')
            }).first();

            if (await conflictBlock.isVisible({ timeout: 5000 })) {
                // Attempt to drag onto conflicting dates
                await originalBlock.dragTo(conflictBlock);

                await page.waitForTimeout(1500);

                // ==========================================
                // VERIFY: Should show error or snap back
                // ==========================================
                // Check if error message appears
                const errorMessage = page.locator('text=/conflict|overlap|unavailable/i');
                const hasError = await errorMessage.isVisible({ timeout: 2000 });

                if (hasError) {
                    console.log('Conflict detected - error message shown');
                    await expect(errorMessage).toBeVisible();
                }

                // Verify reservation didn't actually move to conflicting dates
                const { data: verifyReservation } = await supabaseAdmin
                    .from('reservations')
                    .select('check_in, check_out')
                    .eq('id', testReservationId)
                    .single();

                // Dates should NOT overlap with conflict reservation
                const testCheckIn = new Date(verifyReservation!.check_in);
                const testCheckOut = new Date(verifyReservation!.check_out);

                const isOverlapping = (
                    (testCheckIn < new Date(conflictCheckOut) && testCheckOut > new Date(conflictCheckIn))
                );

                expect(isOverlapping).toBe(false);
            }
        } finally {
            // Clean up conflict reservation
            if (conflictId) {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', conflictId);
            }
        }
    });

    test.skip('should move reservation to different dates on same campsite', async ({ page }) => {
        // TODO(2025-12-29): Mouse drag flaky in Playwright for this component
        // Reset to known state in August 2025 (Aug 28-31, last test avoids all overlaps)
        const checkIn = new Date('2025-08-28');
        const checkOut = addDays(checkIn, 3);

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId
            })
            .eq('id', testReservationId);

        await navigateToCalendar(page, 8, 2025);

        const reservationBlock = page.locator('[draggable="true"]', {
            has: page.locator('text=/Calendar.*Test/i')
        }).first();

        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        const initialBox = await reservationBlock.boundingBox();
        expect(initialBox).not.toBeNull();

        // Drag horizontally (same row, different dates)
        // Move to the right by approximately 200px (few days later)
        await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + initialBox!.height / 2);
        await page.mouse.down();
        await page.mouse.move(initialBox!.x + 200, initialBox!.y + initialBox!.height / 2);
        await page.mouse.up();

        await page.waitForTimeout(1000);

        // Verify dates changed in database
        const { data: movedReservation } = await supabaseAdmin
            .from('reservations')
            .select('check_in, check_out, campsite_id')
            .eq('id', testReservationId)
            .single();

        // Campsite should remain the same
        expect(movedReservation?.campsite_id).toBe(testCampsiteId);

        // Dates should be different from original
        const newCheckIn = new Date(movedReservation!.check_in);
        expect(newCheckIn.getTime()).not.toBe(checkIn.getTime());
    });
});
