import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

/**
 * Admin Happy Path: Reservation Management
 * Tests the critical admin workflows: assign campsite, check-in, and cancel reservations.
 * Verifies both UI state and database state match throughout the lifecycle.
 */
test.describe('Admin Reservation Management - Happy Path', () => {
    let testReservationId: string;

    // Create a test reservation before tests
    test.beforeAll(async () => {
        const tomorrow = addDays(new Date(), 3);
        const checkOut = addDays(tomorrow, 2);

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .insert({
                first_name: 'E2E',
                last_name: 'TestUser',
                email: 'e2e.admin.test@example.com',
                phone: '555-0199',
                address1: '123 Test St',
                city: 'Test City',
                postal_code: '12345',
                check_in: format(tomorrow, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                rv_length: '25',
                camping_unit: 'RV / Trailer',
                contact_method: 'Email',
                status: 'pending',
                // Ensure monetary fields are populated to satisfy NOT NULL constraints
                total_amount: 200,
                amount_paid: 0,
                balance_due: 200
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create test reservation: ${error.message}`);
        }

        testReservationId = data.id;
        console.log('Created test reservation:', testReservationId);
    });

    // Clean up test reservation after tests
    test.afterAll(async () => {
        if (testReservationId) {
            await supabaseAdmin
                .from('reservations')
                .delete()
                .eq('id', testReservationId);
            console.log('Cleaned up test reservation:', testReservationId);
        }
    });

    test('should assign campsite to pending reservation', async ({ page }) => {
        // ==========================================
        // STEP 1: Navigate to Admin Dashboard
        // ==========================================
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // ==========================================
        // STEP 2: Find Test Reservation
        // ==========================================
        // Filter to pending reservations
        await page.getByRole('button', { name: /pending/i }).click();

        // Find our test reservation by email
        const reservationRow = page.locator('tr', {
            has: page.locator('text=e2e.admin.test@example.com')
        });
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        // Verify status is "pending"
        await expect(reservationRow.getByText('pending', { exact: false })).toBeVisible();

        // ==========================================
        // STEP 3: Open Assignment Dialog
        // ==========================================
        // Click the assign/actions button on the row
        const actionsButton = reservationRow.getByRole('button', { name: /assign|actions/i });
        await actionsButton.click();

        // Look for "Assign Campsite" option
        await page.getByRole('menuitem', { name: /Assign Campsite/i }).click();

        // Assignment dialog should open
        await expect(page.getByRole('heading', { name: /Assign Campsite/i })).toBeVisible();

        // ==========================================
        // STEP 4: Select Campsite
        // ==========================================
        // Get available campsites from the dialog
        const campsiteOptions = page.locator('[data-testid="campsite-option"]');
        await expect(campsiteOptions.first()).toBeVisible({ timeout: 5000 });

        // Click first available campsite
        await campsiteOptions.first().click();

        // Confirm assignment
        await page.getByRole('button', { name: /Confirm|Assign/i }).click();

        // ==========================================
        // STEP 5: Verify UI Update
        // ==========================================
        // Dialog should close
        await expect(page.getByRole('heading', { name: /Assign Campsite/i })).not.toBeVisible({ timeout: 5000 });

        // Status should change to "confirmed"
        await expect(reservationRow.getByText('confirmed', { exact: false })).toBeVisible({ timeout: 5000 });

        // Campsite should be displayed
        await expect(reservationRow.locator('text=/Site [A-Z0-9]+/i')).toBeVisible();

        // ==========================================
        // STEP 6: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('confirmed');
        expect(dbReservation?.campsite_id).not.toBeNull();
    });

    test('should check-in a confirmed reservation', async ({ page }) => {
        // First ensure reservation has a campsite assigned
        const { data: existingReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        // If not assigned, assign a campsite first
        if (!existingReservation?.campsite_id) {
            const { data: campsites } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('is_active', true)
                .limit(1);

            if (campsites && campsites.length > 0) {
                await supabaseAdmin
                    .from('reservations')
                    .update({
                        campsite_id: campsites[0].id,
                        status: 'confirmed'
                    })
                    .eq('id', testReservationId);
            }
        }

        // ==========================================
        // STEP 1: Navigate to Admin Dashboard
        // ==========================================
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // ==========================================
        // STEP 2: Find Test Reservation
        // ==========================================
        // Filter to confirmed reservations
        await page.getByRole('button', { name: /confirmed/i }).click();

        const reservationRow = page.locator('tr', {
            has: page.locator('text=e2e.admin.test@example.com')
        });
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 3: Check In Reservation
        // ==========================================
        // Click actions button
        const actionsButton = reservationRow.getByRole('button', { name: /actions/i }).first();
        await actionsButton.click();

        // Click "Check In" option
        await page.getByRole('menuitem', { name: /Check In/i }).click();

        // ==========================================
        // STEP 4: Verify UI Update
        // ==========================================
        // Status should change to "checked_in"
        await expect(reservationRow.getByText('checked_in', { exact: false })).toBeVisible({ timeout: 5000 });

        // ==========================================
        // STEP 5: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('checked_in');
    });

    test('should cancel a reservation', async ({ page }) => {
        // Ensure reservation is in a cancellable state
        await supabaseAdmin
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', testReservationId);

        // ==========================================
        // STEP 1: Navigate to Admin Dashboard
        // ==========================================
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        // ==========================================
        // STEP 2: Find Test Reservation
        // ==========================================
        const reservationRow = page.locator('tr', {
            has: page.locator('text=e2e.admin.test@example.com')
        });
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 3: Cancel Reservation
        // ==========================================
        const actionsButton = reservationRow.getByRole('button', { name: /actions/i }).first();
        await actionsButton.click();

        await page.getByRole('menuitem', { name: /Cancel/i }).click();

        // Confirm cancellation if there's a confirmation dialog
        const confirmButton = page.getByRole('button', { name: /Confirm.*Cancel/i });
        if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
        }

        // ==========================================
        // STEP 4: Verify UI Update
        // ==========================================
        // Status should change to "cancelled"
        await expect(reservationRow.getByText('cancelled', { exact: false })).toBeVisible({ timeout: 5000 });

        // ==========================================
        // STEP 5: Verify Database State
        // ==========================================
        const { data: dbReservation } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('id', testReservationId)
            .single();

        expect(dbReservation?.status).toBe('cancelled');
    });

    test('should complete full lifecycle: assign → check-in → check-out', async ({ page }) => {
        // Reset reservation to pending state
        await supabaseAdmin
            .from('reservations')
            .update({
                status: 'pending',
                campsite_id: null
            })
            .eq('id', testReservationId);

        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

        const reservationRow = page.locator('tr', {
            has: page.locator('text=e2e.admin.test@example.com')
        });

        // ==========================================
        // 1. ASSIGN CAMPSITE
        // ==========================================
        await page.getByRole('button', { name: /pending/i }).click();
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        let actionsButton = reservationRow.getByRole('button', { name: /assign|actions/i });
        await actionsButton.click();
        await page.getByRole('menuitem', { name: /Assign Campsite/i }).click();
        await expect(page.getByRole('heading', { name: /Assign Campsite/i })).toBeVisible();

        const campsiteOptions = page.locator('[data-testid="campsite-option"]');
        await expect(campsiteOptions.first()).toBeVisible({ timeout: 5000 });
        await campsiteOptions.first().click();
        await page.getByRole('button', { name: /Confirm|Assign/i }).click();

        await expect(reservationRow.getByText('confirmed', { exact: false })).toBeVisible({ timeout: 5000 });

        // ==========================================
        // 2. CHECK IN
        // ==========================================
        await page.getByRole('button', { name: /confirmed/i }).click();
        await expect(reservationRow).toBeVisible({ timeout: 10000 });

        actionsButton = reservationRow.getByRole('button', { name: /actions/i }).first();
        await actionsButton.click();
        await page.getByRole('menuitem', { name: /Check In/i }).click();

        await expect(reservationRow.getByText('checked_in', { exact: false })).toBeVisible({ timeout: 5000 });

        // ==========================================
        // 3. CHECK OUT
        // ==========================================
        actionsButton = reservationRow.getByRole('button', { name: /actions/i }).first();
        await actionsButton.click();
        await page.getByRole('menuitem', { name: /Check Out/i }).click();

        await expect(reservationRow.getByText('checked_out', { exact: false })).toBeVisible({ timeout: 5000 });

        // ==========================================
        // VERIFY FINAL DATABASE STATE
        // ==========================================
        const { data: finalReservation } = await supabaseAdmin
            .from('reservations')
            .select('status, campsite_id')
            .eq('id', testReservationId)
            .single();

        expect(finalReservation?.status).toBe('checked_out');
        expect(finalReservation?.campsite_id).not.toBeNull();
    });
});
