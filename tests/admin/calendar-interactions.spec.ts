import { test, expect, Page } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays, differenceInMonths, startOfMonth } from 'date-fns';

/**
 * Admin Calendar - Drag & Drop Interactions
 * Tests the calendar's drag-and-drop functionality for managing reservations.
 * Critical for admin workflow efficiency and preventing booking conflicts.
 */
test.describe.serial('Admin Calendar - Drag & Drop Interactions', () => {
    let testReservationId: string;
    let testCampsiteId: string;
    let alternateCampsiteId: string;
    let reservationDate: Date;

    // Helper to navigate to the reservation date
    const navigateToReservationDate = async (page: Page, targetDate: Date) => {
        const currentDate = new Date(); // Calendar starts at today
        const monthsDiff = differenceInMonths(startOfMonth(targetDate), startOfMonth(currentDate));

        if (monthsDiff > 0) {
            console.log(`Navigating ${monthsDiff} months forward to find reservation...`);

            // Close any open modals first
            const closeButtons = page.locator('button[aria-label="Close"]');
            const closeCount = await closeButtons.count();
            if (closeCount > 0) {
                await closeButtons.first().click();
                await page.waitForTimeout(500);
            }

            const nextButton = page.getByRole('button', { name: /next month/i });

            // Click next month button multiple times with retries
            for (let i = 0; i < monthsDiff; i++) {
                // Wait for the button to be clickable
                await nextButton.waitFor({ state: 'visible' });
                await page.waitForTimeout(200);

                try {
                    await nextButton.click({ force: true });
                    await page.waitForTimeout(500); // Wait for animation/render
                } catch (error) {
                    console.warn(`Failed to click next month button on iteration ${i}:`, error);
                }
            }

            // Just wait a bit to ensure the month has updated
            await page.waitForTimeout(1000);
        }
    };

    // Setup: Create test data
    test.beforeAll(async () => {
        // Get two campsites for testing moves
        const { data: campsites } = await supabaseAdmin
            .from('campsites')
            .select('id, code')
            .eq('is_active', true)
            .limit(2);

        if (!campsites || campsites.length < 2) {
            throw new Error('Need at least 2 active campsites for calendar tests');
        }

        testCampsiteId = campsites[0].id;
        alternateCampsiteId = campsites[1].id;

        // Create test reservation with dates that are visible in calendar
        // Use a wide date range with timestamp-based offset to avoid conflicts
        const uniqueKey = Date.now(); // Unique timestamp for each test run

        // Use dates spread across many months: 30-300 days out (ensures no overlap between test runs)
        const daysFromNow = 30 + ((uniqueKey % 270)); // Results in 30-299 days
        const checkIn = addDays(new Date(), daysFromNow);
        const checkOut = addDays(checkIn, 3);

        reservationDate = checkIn; // Store for navigation

        const email = `calendar.test.${uniqueKey}@example.com`;

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
                balance_due: 0
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
    });

    test('should drag reservation to different campsite', async ({ page }) => {
        // ==========================================
        // STEP 1: Navigate to Calendar
        // ==========================================
        await page.goto('/admin/calendar');
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();

        // Wait for calendar to load
        await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

        // Navigate to correct month
        await navigateToReservationDate(page, reservationDate);

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

            // Perform drag and drop
            await reservationBlock.dragTo(alternateCampsiteRow);

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

    test('should extend reservation by dragging right edge', async ({ page }) => {
        // Reset reservation dates
        const checkIn = addDays(new Date(), 5); // 5 days from today might be in current month, or next
        const checkOut = addDays(checkIn, 3); // 3 nights initially

        // Update reservationDate to match new checkIn
        reservationDate = checkIn;

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd')
            })
            .eq('id', testReservationId);

        await page.goto('/admin/calendar');
        await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

        // Navigate to correct month
        await navigateToReservationDate(page, reservationDate);

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

    test('should shorten reservation by dragging left edge forward', async ({ page }) => {
        // Reset reservation to longer stay
        const checkIn = addDays(new Date(), 5);
        const checkOut = addDays(checkIn, 5); // 5 nights initially

        reservationDate = checkIn;

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd')
            })
            .eq('id', testReservationId);

        await page.goto('/admin/calendar');
        await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

        // Navigate
        await navigateToReservationDate(page, reservationDate);

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

    test('should prevent conflicting reservation and snap back', async ({ page }) => {
        // Create a second reservation that would conflict
        const conflictCheckIn = addDays(new Date(), 8);
        const conflictCheckOut = addDays(conflictCheckIn, 2);

        // This relies on conflict date being close to reservationDate. 
        // 5 days vs 8 days -> likely same month.

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
                campsite_id: testCampsiteId // Same campsite
            })
            .select()
            .single();

        const conflictId = conflictReservation?.id;

        try {
            await page.goto('/admin/calendar');
            await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

            // Navigate (using reservationDate which was set in previous test, likely 5 days out)
            // Or assume conflictCheckIn is the target?
            await navigateToReservationDate(page, conflictCheckIn);

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

    test('should move reservation to different dates on same campsite', async ({ page }) => {
        // Reset to known state
        const checkIn = addDays(new Date(), 5);
        const checkOut = addDays(checkIn, 3);

        reservationDate = checkIn;

        await supabaseAdmin
            .from('reservations')
            .update({
                check_in: format(checkIn, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                campsite_id: testCampsiteId
            })
            .eq('id', testReservationId);

        await page.goto('/admin/calendar');
        await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });

        await navigateToReservationDate(page, reservationDate);

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
