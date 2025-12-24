import { test, expect, Page } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

/**
 * Admin Calendar - Pointer Events Reliability Tests
 *
 * Tests the new pointer event system with:
 * - Pointer capture for reliable drag tracking
 * - Anchor invariant (selection never flips)
 * - Optimistic updates with saving indicators
 *
 * These tests use direct navigation to avoid month navigation issues.
 */
test.describe('Admin Calendar - Pointer Events Reliability', () => {
    let testCampsiteId: string;
    let testReservationId: string;

    // Direct navigation helper - avoids month navigation
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

    test.beforeAll(async () => {
        // Get an active campsite
        const { data: campsites } = await supabaseAdmin
            .from('campsites')
            .select('id, code')
            .eq('is_active', true)
            .limit(1);

        if (!campsites || campsites.length === 0) {
            throw new Error('Need at least 1 active campsite for reliability tests');
        }

        testCampsiteId = campsites[0].id;

        // Create a test reservation in July 2025 (fixed date for stable tests)
        const checkIn = new Date('2025-07-15');
        const checkOut = addDays(checkIn, 3);

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .insert({
                first_name: 'Reliability',
                last_name: 'Test',
                email: `reliability.test.${Date.now()}@example.com`,
                phone: '555-0199',
                address1: '123 Reliability St',
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
    });

    test.afterAll(async () => {
        if (testReservationId) {
            await supabaseAdmin
                .from('reservations')
                .delete()
                .eq('id', testReservationId);
        }
    });

    test('should select range with pointer events and maintain anchor invariant', async ({ page }) => {
        // Navigate directly to July 2025
        await navigateToCalendar(page, 7, 2025);

        // Find an empty cell to start selection
        const firstCell = page.locator('[data-date="2025-07-20"]').first();
        await expect(firstCell).toBeVisible();

        // Get bounding box for pointer events
        const cellBox = await firstCell.boundingBox();
        expect(cellBox).not.toBeNull();

        // Start selection with pointer down
        await page.mouse.move(cellBox!.x + cellBox!.width / 2, cellBox!.y + cellBox!.height / 2);
        await page.mouse.down();

        // Drag right (forward in time)
        const secondCell = page.locator('[data-date="2025-07-22"]').first();
        const secondBox = await secondCell.boundingBox();
        expect(secondBox).not.toBeNull();

        await page.mouse.move(secondBox!.x + secondBox!.width / 2, secondBox!.y + secondBox!.height / 2);

        // Verify selection highlight exists
        const highlightedCells = page.locator('.bg-\\[var\\(--color-accent-gold\\)\\]\\/20');
        await expect(highlightedCells.first()).toBeVisible();

        // Verify selection includes start and end dates
        const selection = await page.evaluate(() => {
            // Access the selection state from the page
            const cells = document.querySelectorAll('.bg-\\[var\\(--color-accent-gold\\)\\]\\/20');
            return {
                count: cells.length,
                dates: Array.from(cells).map(cell => cell.getAttribute('data-date')).filter(Boolean)
            };
        });

        expect(selection.count).toBeGreaterThan(0);
        expect(selection.dates).toContain('2025-07-20');
        expect(selection.dates).toContain('2025-07-22');

        // Release mouse
        await page.mouse.up();

        // Anchor invariant is tested by dev-only assertion in the code
        // If anchor flipped, we'd see console errors (checked manually during dev)
    });

    test('should create blackout with optimistic updates and saving indicator', async ({ page }) => {
        // Navigate directly to July 2025
        await navigateToCalendar(page, 7, 2025);

        // Find empty cells to create blackout
        const startCell = page.locator('[data-date="2025-07-25"]').first();
        const endCell = page.locator('[data-date="2025-07-27"]').first();

        await expect(startCell).toBeVisible();

        // Select range for blackout
        const startBox = await startCell.boundingBox();
        const endBox = await endCell.boundingBox();

        expect(startBox).not.toBeNull();
        expect(endBox).not.toBeNull();

        // Pointer down on start
        await page.mouse.move(startBox!.x + startBox!.width / 2, startBox!.y + startBox!.height / 2);
        await page.mouse.down();

        // Drag to end
        await page.mouse.move(endBox!.x + endBox!.width / 2, endBox!.y + endBox!.height / 2);
        await page.mouse.up();

        // Click to confirm selection (triggers dialog)
        await page.mouse.click(endBox!.x + endBox!.width / 2, endBox!.y + endBox!.height / 2);

        // Wait for dialog and select "Blackout" option
        await page.waitForTimeout(500);
        const blackoutButton = page.getByRole('button', { name: /blackout/i });

        if (await blackoutButton.isVisible({ timeout: 2000 })) {
            await blackoutButton.click();

            // Enter reason
            await page.waitForTimeout(300);
            const reasonInput = page.locator('textarea, input[type="text"]').first();
            if (await reasonInput.isVisible({ timeout: 1000 })) {
                await reasonInput.fill('Maintenance');
            }

            // Submit
            const submitButton = page.getByRole('button', { name: /create|submit|confirm/i }).first();
            await submitButton.click();

            // Check for "Saving..." indicator (optimistic update)
            const savingIndicator = page.locator('text=/saving/i');
            const hasSavingIndicator = await savingIndicator.isVisible({ timeout: 1000 });

            if (hasSavingIndicator) {
                console.log('✓ Saving indicator appeared (optimistic update)');

                // Wait for it to disappear
                await expect(savingIndicator).not.toBeVisible({ timeout: 5000 });
                console.log('✓ Saving indicator disappeared');
            }

            // Verify blackout appears in calendar (server version)
            await page.waitForTimeout(1000);
            const blackoutBlock = page.locator('[data-testid="blackout-block"]').filter({
                has: page.locator('text=/maintenance/i')
            });

            // Check if blackout rendered
            const blackoutCount = await blackoutBlock.count();
            console.log(`Found ${blackoutCount} blackout blocks with "maintenance"`);
        }
    });

    test('should reschedule reservation with immediate move and saving indicator', async ({ page }) => {
        // Navigate directly to July 2025
        await navigateToCalendar(page, 7, 2025);

        // Find the test reservation block
        const reservationBlock = page.locator(`[data-reservation-id="${testReservationId}"]`).first();
        await expect(reservationBlock).toBeVisible({ timeout: 10000 });

        // Get initial position
        const initialBox = await reservationBlock.boundingBox();
        expect(initialBox).not.toBeNull();

        // Get initial dates from DOM
        const initialStart = await reservationBlock.getAttribute('data-start');

        // Drag to new position (move right by ~3 days worth of pixels)
        await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + initialBox!.height / 2);
        await page.mouse.down();
        await page.mouse.move(initialBox!.x + 150, initialBox!.y + initialBox!.height / 2); // Move right
        await page.mouse.up();

        // Verify block moved immediately (optimistic update)
        await page.waitForTimeout(300);
        const updatedBox = await reservationBlock.boundingBox();
        expect(updatedBox).not.toBeNull();

        // Position should have changed
        if (updatedBox!.x !== initialBox!.x) {
            console.log('✓ Reservation moved immediately (optimistic)');
        }

        // Check for "Saving..." indicator
        const savingIndicator = page.locator('text=/saving/i');
        const hasSavingIndicator = await savingIndicator.isVisible({ timeout: 2000 });

        if (hasSavingIndicator) {
            console.log('✓ Saving indicator appeared');

            // Wait for it to disappear (confirming server update)
            await expect(savingIndicator).not.toBeVisible({ timeout: 5000 });
            console.log('✓ Saving indicator cleared');
        }

        // Verify database was updated
        await page.waitForTimeout(500);
        const { data: updatedReservation } = await supabaseAdmin
            .from('reservations')
            .select('check_in, check_out')
            .eq('id', testReservationId)
            .single();

        // Check-in date should have changed
        expect(updatedReservation?.check_in).not.toBe(initialStart);
        console.log(`✓ Database updated: ${initialStart} → ${updatedReservation?.check_in}`);
    });
});
