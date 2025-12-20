import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';
import crypto from 'crypto';

/**
 * Guest Self-Service: Manage Reservation
 * Tests the critical guest workflow: view and cancel reservations via magic link
 * This reduces admin workload and improves customer satisfaction
 */
test.describe('Guest Manage Reservation', () => {
    // Helper functions matching the API implementation
    function generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    function hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    test.describe('View Reservation', () => {
        let testReservationId: string;
        let testToken: string;

        test.beforeEach(async () => {
            // Create test reservation with token
            const tomorrow = addDays(new Date(), 5);
            const checkOut = addDays(tomorrow, 3);
            testToken = generateToken();
            const tokenHash = hashToken(testToken);

            const { data, error } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Guest',
                    last_name: 'Manager',
                    email: 'guest.manage@test.com',
                    phone: '555-0150',
                    address1: '456 Guest Ave',
                    city: 'Guest City',
                    postal_code: '54321',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 1,
                    rv_length: '30',
                    camping_unit: 'RV / Trailer',
                    contact_method: 'Email',
                    status: 'confirmed',
                    public_edit_token_hash: tokenHash,
                    total_amount: 150.00,
                })
                .select()
                .single();

            if (error) throw new Error(`Failed to create test reservation: ${error.message}`);
            testReservationId = data.id;
        });

        test.afterEach(async () => {
            if (testReservationId) {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testReservationId);
            }
        });

        test('should display reservation details with valid token', async ({ page }) => {
            // Navigate to manage reservation page with token
            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);

            // Wait for page to load
            await expect(page.getByRole('heading', { name: 'Your Reservation' })).toBeVisible({ timeout: 10000 });

            // Verify guest information is displayed
            await expect(page.getByText('Guest Manager')).toBeVisible();
            await expect(page.getByText('guest.manage@test.com')).toBeVisible();
            await expect(page.getByText('555-0150')).toBeVisible();
            await expect(page.getByText('Guest City')).toBeVisible();

            // Verify reservation details
            await expect(page.getByText('2 Adults, 1 Children')).toBeVisible();
            await expect(page.getByText('RV / Trailer')).toBeVisible();
            await expect(page.getByText('30')).toBeVisible(); // RV length

            // Verify status badge shows confirmed
            await expect(page.getByText(/CONFIRMED/i)).toBeVisible();

            // Verify cancel button is available
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).toBeVisible();
        });

        test('should show error with invalid token', async ({ page }) => {
            const invalidToken = generateToken(); // Different token

            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${invalidToken}`);

            // Should show error message
            await expect(page.getByRole('heading', { name: /Unable to Load Reservation/i })).toBeVisible();
            await expect(page.getByText(/Reservation not found or invalid link/i)).toBeVisible();

            // Should not show reservation details
            await expect(page.getByText('Guest Manager')).not.toBeVisible();
        });

        test('should show error with missing parameters', async ({ page }) => {
            // Missing token
            await page.goto(`/manage-reservation?rid=${testReservationId}`);
            await expect(page.getByRole('heading', { name: /Unable to Load Reservation/i })).toBeVisible();
            await expect(page.getByText(/Invalid or missing reservation link/i)).toBeVisible();

            // Missing reservation ID
            await page.goto(`/manage-reservation?t=${testToken}`);
            await expect(page.getByRole('heading', { name: /Unable to Load Reservation/i })).toBeVisible();
        });

        test('should show error with non-existent reservation ID', async ({ page }) => {
            const fakeId = '00000000-0000-0000-0000-000000000999';
            await page.goto(`/manage-reservation?rid=${fakeId}&t=${testToken}`);

            await expect(page.getByRole('heading', { name: /Unable to Load Reservation/i })).toBeVisible();
            await expect(page.getByText(/Reservation not found or invalid link/i)).toBeVisible();
        });
    });

    test.describe('Cancel Reservation', () => {
        let testReservationId: string;
        let testToken: string;

        test.beforeEach(async () => {
            const tomorrow = addDays(new Date(), 7);
            const checkOut = addDays(tomorrow, 2);
            testToken = generateToken();
            const tokenHash = hashToken(testToken);

            const { data, error } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Cancel',
                    last_name: 'Test',
                    email: 'cancel.test@test.com',
                    phone: '555-0160',
                    address1: '789 Cancel Rd',
                    city: 'Cancel City',
                    postal_code: '99999',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '25',
                    camping_unit: 'Tent',
                    contact_method: 'Email',
                    status: 'confirmed',
                    public_edit_token_hash: tokenHash,
                    total_amount: 150.00,
                })
                .select()
                .single();

            if (error) throw new Error(`Failed to create test reservation: ${error.message}`);
            testReservationId = data.id;
        });

        test.afterEach(async () => {
            if (testReservationId) {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testReservationId);
            }
        });

        test('should cancel confirmed reservation successfully', async ({ page }) => {
            // Navigate to manage page
            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByRole('heading', { name: 'Your Reservation' })).toBeVisible();

            // Verify initial status is confirmed
            await expect(page.getByText(/CONFIRMED/i)).toBeVisible();

            // Listen for confirmation dialog
            page.once('dialog', async dialog => {
                expect(dialog.message()).toContain('Are you sure you want to cancel');
                await dialog.accept(); // Click OK
            });

            // Click cancel button
            await page.getByRole('button', { name: /Cancel Reservation/i }).click();

            // Wait for alert confirming cancellation
            page.once('dialog', async dialog => {
                expect(dialog.message()).toContain('cancelled successfully');
                await dialog.accept();
            });

            // Wait a moment for UI to update
            await page.waitForTimeout(1000);

            // Verify status changed to cancelled in UI
            await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();

            // Verify cancel button is no longer shown
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).not.toBeVisible();

            // Verify cancellation message is shown
            await expect(page.getByText(/This reservation has been cancelled/i)).toBeVisible();

            // Verify in database
            const { data } = await supabaseAdmin
                .from('reservations')
                .select('status')
                .eq('id', testReservationId)
                .single();

            expect(data?.status).toBe('cancelled');
        });

        test('should cancel pending reservation successfully', async ({ page }) => {
            // Update reservation to pending status
            await supabaseAdmin
                .from('reservations')
                .update({ status: 'pending' })
                .eq('id', testReservationId);

            // Navigate to manage page
            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByText(/PENDING/i)).toBeVisible();

            // Cancel button should be visible for pending reservations
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).toBeVisible();

            // Accept confirmation dialog
            page.once('dialog', async dialog => {
                await dialog.accept();
            });

            // Click cancel
            await page.getByRole('button', { name: /Cancel Reservation/i }).click();

            // Accept success alert
            page.once('dialog', async dialog => {
                await dialog.accept();
            });

            await page.waitForTimeout(1000);

            // Verify cancelled
            await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();

            const { data } = await supabaseAdmin
                .from('reservations')
                .select('status')
                .eq('id', testReservationId)
                .single();

            expect(data?.status).toBe('cancelled');
        });

        test('should not show cancel button for checked-in reservation', async ({ page }) => {
            // Update to checked_in status
            await supabaseAdmin
                .from('reservations')
                .update({ status: 'checked_in' })
                .eq('id', testReservationId);

            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByText(/CHECKED.?IN/i)).toBeVisible();

            // Cancel button should NOT be visible
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).not.toBeVisible();
        });

        test('should not show cancel button for checked-out reservation', async ({ page }) => {
            // Update to checked_out status
            await supabaseAdmin
                .from('reservations')
                .update({ status: 'checked_out' })
                .eq('id', testReservationId);

            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByText(/CHECKED.?OUT/i)).toBeVisible();

            // Cancel button should NOT be visible
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).not.toBeVisible();
        });

        test('should not show cancel button for already cancelled reservation', async ({ page }) => {
            // Update to cancelled status
            await supabaseAdmin
                .from('reservations')
                .update({ status: 'cancelled' })
                .eq('id', testReservationId);

            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();

            // Cancel button should NOT be visible
            await expect(page.getByRole('button', { name: /Cancel Reservation/i })).not.toBeVisible();

            // Should show cancelled message
            await expect(page.getByText(/This reservation has been cancelled/i)).toBeVisible();
        });

        test('should reject cancellation with invalid token', async ({ page }) => {
            const invalidToken = generateToken();

            // Try to cancel via API directly
            const response = await page.request.post('/api/public/manage-reservation/cancel', {
                data: {
                    reservation_id: testReservationId,
                    token: invalidToken,
                },
            });

            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.error).toContain('not found');

            // Verify status unchanged in database
            const { data } = await supabaseAdmin
                .from('reservations')
                .select('status')
                .eq('id', testReservationId)
                .single();

            expect(data?.status).toBe('confirmed'); // Still confirmed
        });

        test('should reject cancellation when user dismisses confirmation', async ({ page }) => {
            await page.goto(`/manage-reservation?rid=${testReservationId}&t=${testToken}`);
            await expect(page.getByRole('heading', { name: 'Your Reservation' })).toBeVisible();

            // Listen for confirmation dialog and dismiss it
            page.once('dialog', async dialog => {
                await dialog.dismiss(); // Click Cancel
            });

            await page.getByRole('button', { name: /Cancel Reservation/i }).click();

            // Wait a moment
            await page.waitForTimeout(500);

            // Status should still be confirmed
            await expect(page.getByText(/CONFIRMED/i)).toBeVisible();

            // Verify in database
            const { data } = await supabaseAdmin
                .from('reservations')
                .select('status')
                .eq('id', testReservationId)
                .single();

            expect(data?.status).toBe('confirmed');
        });
    });

    test.describe('API Validation', () => {
        test('should reject request with missing parameters', async ({ page }) => {
            // Missing token
            let response = await page.request.post('/api/public/manage-reservation', {
                data: { reservation_id: 'some-id' },
            });
            expect(response.status()).toBe(400);
            let body = await response.json();
            expect(body.error).toContain('Missing parameters');

            // Missing reservation_id
            response = await page.request.post('/api/public/manage-reservation', {
                data: { token: 'some-token' },
            });
            expect(response.status()).toBe(400);
            body = await response.json();
            expect(body.error).toContain('Missing parameters');

            // Both missing
            response = await page.request.post('/api/public/manage-reservation', {
                data: {},
            });
            expect(response.status()).toBe(400);
        });

        test('should reject cancel request for already cancelled reservation via API', async ({ page }) => {
            const tomorrow = addDays(new Date(), 10);
            const checkOut = addDays(tomorrow, 2);
            const testToken = generateToken();
            const tokenHash = hashToken(testToken);

            // Create cancelled reservation
            const { data } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Already',
                    last_name: 'Cancelled',
                    email: 'cancelled@test.com',
                    phone: '555-0170',
                    address1: '123 Cancel St',
                    city: 'Cancel Town',
                    postal_code: '11111',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '20',
                    camping_unit: 'Tent',
                    contact_method: 'Email',
                    status: 'cancelled',
                    public_edit_token_hash: tokenHash,
                    total_amount: 150.00,
                })
                .select()
                .single();

            const testId = data!.id;

            try {
                // Try to cancel again
                const response = await page.request.post('/api/public/manage-reservation/cancel', {
                    data: {
                        reservation_id: testId,
                        token: testToken,
                    },
                });

                expect(response.status()).toBe(400);
                const body = await response.json();
                expect(body.error).toContain('already cancelled');
            } finally {
                // Cleanup
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testId);
            }
        });

        test('should reject cancel request for checked-in reservation via API', async ({ page }) => {
            const tomorrow = addDays(new Date(), 12);
            const checkOut = addDays(tomorrow, 2);
            const testToken = generateToken();
            const tokenHash = hashToken(testToken);

            // Create checked-in reservation
            const { data } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Checked',
                    last_name: 'In',
                    email: 'checkedin@test.com',
                    phone: '555-0180',
                    address1: '789 Campsite Rd',
                    city: 'Camptown',
                    postal_code: '22222',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '28',
                    camping_unit: 'RV / Trailer',
                    contact_method: 'Email',
                    status: 'checked_in',
                    public_edit_token_hash: tokenHash,
                    total_amount: 150.00,
                })
                .select()
                .single();



            if (!data) throw new Error('Failed to create test reservation');

            const testId = data.id;

            try {
                const response = await page.request.post('/api/public/manage-reservation/cancel', {
                    data: {
                        reservation_id: testId,
                        token: testToken,
                    },
                });

                expect(response.status()).toBe(400);
                const body = await response.json();
                expect(body.error).toContain('checked in');
            } finally {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testId);
            }
        });
    });
});
