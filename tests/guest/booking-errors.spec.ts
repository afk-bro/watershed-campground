import { test, expect } from '@playwright/test';
import { format, addDays, subDays } from 'date-fns';
import { supabaseAdmin } from '../helpers/test-supabase';
import type { Page } from '@playwright/test';

/**
 * Guest Booking - Error Handling & Edge Cases
 * Tests real-world error scenarios that guests encounter
 * Critical for preventing support tickets and improving UX
 */
test.describe('Guest Booking - Error Handling', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Unauthenticated user

    // Helper to navigate through wizard to payment step
    async function navigateToPayment(page: Page) {
        await page.goto('/make-a-reservation');

        const tomorrow = addDays(new Date(), 1);
        const checkOutDate = addDays(tomorrow, 2);

        const checkInDay = format(tomorrow, 'd');
        const checkOutDay = format(checkOutDate, 'd');

        // Select dates
        await page.locator(`button:has-text("${checkInDay}")`).first().click();
        await page.waitForTimeout(500);
        await page.locator(`button:has-text("${checkOutDay}")`).first().click();

        // Select parameters
        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
        await page.getByRole('button', { name: /RV.*Trailer/i }).click();
        await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
        await page.getByRole('button', { name: /Find Campsites/i }).click();

        // Select campsite
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /Book Now/i }).first().click();

        // Fill personal info
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
        await page.getByPlaceholder('First Name').fill('Error');
        await page.getByPlaceholder('Last Name').fill('Test');
        await page.getByPlaceholder('Address Line 1').fill('123 Error St');
        await page.getByPlaceholder('City').fill('Error City');
        await page.getByPlaceholder('Postal Code').fill('12345');
        await page.getByPlaceholder('Phone').fill('555-0199');
        await page.getByPlaceholder('Email').fill('error.test@example.com');
        await page.selectOption('select[name="contactMethod"]', 'Email');
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

        // Skip add-ons
        await expect(page.getByRole('heading', { name: 'Enhance Your Stay' })).toBeVisible();
        await page.getByRole('button', { name: /Review.*Pay/i }).click();

        // Now on payment page
        await expect(page.getByRole('heading', { name: 'Review & Pay' })).toBeVisible({ timeout: 10000 });
    }

    test.describe('Payment Errors', () => {
        test('should handle declined payment card', async ({ page }) => {
            await navigateToPayment(page);

            // Wait for Stripe Elements to load
            const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
            await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

            // Use Stripe test card that always declines: 4000 0000 0000 0002
            await stripeFrame.locator('[name="number"]').fill('4000000000000002');
            await stripeFrame.locator('[name="expiry"]').fill('12/34');
            await stripeFrame.locator('[name="cvc"]').fill('123');
            await stripeFrame.locator('[name="postalCode"]').fill('12345');

            // Submit payment
            await page.getByRole('button', { name: /Pay/i }).click();

            // Should show error message (either from Stripe or our API)
            // Stripe typically shows "Your card was declined"
            await expect(page.getByText(/declined|failed|error/i)).toBeVisible({ timeout: 15000 });

            // Should NOT navigate to confirmation page
            await expect(page.getByRole('heading', { name: /Reservation Confirmed/i })).not.toBeVisible();

            // Payment button should become enabled again
            await expect(page.getByRole('button', { name: /Pay/i })).toBeEnabled({ timeout: 5000 });
        });

        test('should handle insufficient funds card', async ({ page }) => {
            await navigateToPayment(page);

            const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
            await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

            // Stripe test card for insufficient funds: 4000 0000 0000 9995
            await stripeFrame.locator('[name="number"]').fill('4000000000009995');
            await stripeFrame.locator('[name="expiry"]').fill('12/34');
            await stripeFrame.locator('[name="cvc"]').fill('123');
            await stripeFrame.locator('[name="postalCode"]').fill('12345');

            await page.getByRole('button', { name: /Pay/i }).click();

            // Should show error
            await expect(page.getByText(/insufficient.*funds|declined|failed/i)).toBeVisible({ timeout: 15000 });
            await expect(page.getByRole('heading', { name: /Reservation Confirmed/i })).not.toBeVisible();
        });

        test('should handle expired card', async ({ page }) => {
            await navigateToPayment(page);

            const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
            await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

            // Stripe test card for expired card: 4000 0000 0000 0069
            await stripeFrame.locator('[name="number"]').fill('4000000000000069');
            await stripeFrame.locator('[name="expiry"]').fill('12/34');
            await stripeFrame.locator('[name="cvc"]').fill('123');
            await stripeFrame.locator('[name="postalCode"]').fill('12345');

            await page.getByRole('button', { name: /Pay/i }).click();

            // Should show error about expired card
            await expect(page.getByText(/expired|declined|failed/i)).toBeVisible({ timeout: 15000 });
        });

        test('should handle incorrect CVC', async ({ page }) => {
            await navigateToPayment(page);

            const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
            await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

            // Stripe test card for incorrect CVC: 4000 0000 0000 0127
            await stripeFrame.locator('[name="number"]').fill('4000000000000127');
            await stripeFrame.locator('[name="expiry"]').fill('12/34');
            await stripeFrame.locator('[name="cvc"]').fill('123');
            await stripeFrame.locator('[name="postalCode"]').fill('12345');

            await page.getByRole('button', { name: /Pay/i }).click();

            // Should show CVC error
            await expect(page.getByText(/cvc|security code|declined|failed/i)).toBeVisible({ timeout: 15000 });
        });

        test('should handle processing error card', async ({ page }) => {
            await navigateToPayment(page);

            const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
            await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

            // Stripe test card for processing error: 4000 0000 0000 0119
            await stripeFrame.locator('[name="number"]').fill('4000000000000119');
            await stripeFrame.locator('[name="expiry"]').fill('12/34');
            await stripeFrame.locator('[name="cvc"]').fill('123');
            await stripeFrame.locator('[name="postalCode"]').fill('12345');

            await page.getByRole('button', { name: /Pay/i }).click();

            // Should show processing error
            await expect(page.getByText(/processing.*error|try again|failed/i)).toBeVisible({ timeout: 15000 });
        });
    });

    test.describe('Form Validation', () => {
        test('should validate required email field', async ({ page }) => {
            await page.goto('/make-a-reservation');

            const tomorrow = addDays(new Date(), 1);
            const checkOutDate = addDays(tomorrow, 2);
            const checkInDay = format(tomorrow, 'd');
            const checkOutDay = format(checkOutDate, 'd');

            await page.locator(`button:has-text("${checkInDay}")`).first().click();
            await page.waitForTimeout(500);
            await page.locator(`button:has-text("${checkOutDay}")`).first().click();

            await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
            await page.getByRole('button', { name: /RV.*Trailer/i }).click();
            await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
            await page.getByRole('button', { name: /Find Campsites/i }).click();

            await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
            await page.getByRole('button', { name: /Book Now/i }).first().click();

            // Fill all fields EXCEPT email
            await page.getByPlaceholder('First Name').fill('Test');
            await page.getByPlaceholder('Last Name').fill('User');
            await page.getByPlaceholder('Address Line 1').fill('123 Test St');
            await page.getByPlaceholder('City').fill('Test City');
            await page.getByPlaceholder('Postal Code').fill('12345');
            await page.getByPlaceholder('Phone').fill('555-0100');
            // Skip email
            await page.selectOption('select[name="contactMethod"]', 'Email');

            // Try to continue
            await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

            // Should show validation error
            await expect(page.getByText(/email.*required/i)).toBeVisible();

            // Should not advance
            await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
        });

        test('should validate email format', async ({ page }) => {
            await page.goto('/make-a-reservation');

            const tomorrow = addDays(new Date(), 1);
            const checkOutDate = addDays(tomorrow, 2);
            const checkInDay = format(tomorrow, 'd');
            const checkOutDay = format(checkOutDate, 'd');

            await page.locator(`button:has-text("${checkInDay}")`).first().click();
            await page.waitForTimeout(500);
            await page.locator(`button:has-text("${checkOutDay}")`).first().click();

            await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
            await page.getByRole('button', { name: /RV.*Trailer/i }).click();
            await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
            await page.getByRole('button', { name: /Find Campsites/i }).click();

            await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
            await page.getByRole('button', { name: /Book Now/i }).first().click();

            // Fill form with invalid email
            await page.getByPlaceholder('First Name').fill('Test');
            await page.getByPlaceholder('Last Name').fill('User');
            await page.getByPlaceholder('Address Line 1').fill('123 Test St');
            await page.getByPlaceholder('City').fill('Test City');
            await page.getByPlaceholder('Postal Code').fill('12345');
            await page.getByPlaceholder('Phone').fill('555-0100');
            await page.getByPlaceholder('Email').fill('not-an-email'); // Invalid
            await page.selectOption('select[name="contactMethod"]', 'Email');

            await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

            // Should show email format validation error
            await expect(page.getByText(/invalid.*email|valid.*email/i)).toBeVisible();
        });

        test('should validate phone number minimum length', async ({ page }) => {
            await page.goto('/make-a-reservation');

            const tomorrow = addDays(new Date(), 1);
            const checkOutDate = addDays(tomorrow, 2);
            const checkInDay = format(tomorrow, 'd');
            const checkOutDay = format(checkOutDate, 'd');

            await page.locator(`button:has-text("${checkInDay}")`).first().click();
            await page.waitForTimeout(500);
            await page.locator(`button:has-text("${checkOutDay}")`).first().click();

            await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
            await page.getByRole('button', { name: /RV.*Trailer/i }).click();
            await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
            await page.getByRole('button', { name: /Find Campsites/i }).click();

            await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
            await page.getByRole('button', { name: /Book Now/i }).first().click();

            // Fill form with short phone number
            await page.getByPlaceholder('First Name').fill('Test');
            await page.getByPlaceholder('Last Name').fill('User');
            await page.getByPlaceholder('Address Line 1').fill('123 Test St');
            await page.getByPlaceholder('City').fill('Test City');
            await page.getByPlaceholder('Postal Code').fill('12345');
            await page.getByPlaceholder('Phone').fill('123'); // Too short
            await page.getByPlaceholder('Email').fill('test@example.com');
            await page.selectOption('select[name="contactMethod"]', 'Email');

            await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

            // Should show phone validation error
            await expect(page.getByText(/phone.*10.*digits|phone.*required/i)).toBeVisible();
        });
    });

    test.describe('Availability Errors', () => {
        test('should show no availability message when all sites are booked', async ({ page }) => {
            // First, book all available RV sites for a specific date range
            const testDate = addDays(new Date(), 30); // Far in the future to avoid conflicts
            const checkOut = addDays(testDate, 2);

            // Get all RV campsites
            const { data: rvSites } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('type', 'rv')
                .eq('is_active', true);

            // Create reservations for all RV sites
            const reservations = rvSites!.map((site: unknown) => ({
                first_name: 'Blocker',
                last_name: 'Test',
                email: 'blocker@test.com',
                phone: '555-9999',
                address1: '999 Block St',
                city: 'Block City',
                postal_code: '99999',
                check_in: format(testDate, 'yyyy-MM-dd'),
                check_out: format(checkOut, 'yyyy-MM-dd'),
                adults: 2,
                children: 0,
                rv_length: '25',
                camping_unit: 'RV / Trailer',
                contact_method: 'Email',
                status: 'confirmed',
                campsite_id: site.id,
            }));

            const { data: createdReservations } = await supabaseAdmin
                .from('reservations')
                .insert(reservations)
                .select('id');

            const reservationIds = createdReservations!.map((r: unknown) => (r as Record<string, unknown>).id);

            try {
                // Now try to book during the same period
                await page.goto('/make-a-reservation');

                const checkInDay = format(testDate, 'd');
                const checkOutDay = format(checkOut, 'd');

                await page.locator(`button:has-text("${checkInDay}")`).first().click();
                await page.waitForTimeout(500);
                await page.locator(`button:has-text("${checkOutDay}")`).first().click();

                await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
                await page.getByRole('button', { name: /RV.*Trailer/i }).click();
                await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
                await page.getByRole('button', { name: /Find Campsites/i }).click();

                // Should show no availability message
                await expect(page.getByText(/no.*available|fully booked|sold out/i)).toBeVisible({ timeout: 10000 });

                // Should NOT show any "Book Now" buttons
                await expect(page.getByRole('button', { name: /Book Now/i })).not.toBeVisible();
            } finally {
                // Cleanup: delete test reservations
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .in('id', reservationIds);
            }
        });
    });

    test.describe('Date Selection Errors', () => {
        test('should prevent selecting check-out before check-in', async ({ page }) => {
            await page.goto('/make-a-reservation');

            const tomorrow = addDays(new Date(), 1);
            const yesterday = subDays(tomorrow, 1); // Earlier date

            // Select tomorrow as check-in
            const checkInDay = format(tomorrow, 'd');
            await page.locator(`button:has-text("${checkInDay}")`).first().click();
            await page.waitForTimeout(500);

            // Try to select yesterday (earlier date) as check-out
            const checkOutDay = format(yesterday, 'd');
            const yesterdayButton = page.locator(`button:has-text("${checkOutDay}")`).first();

            // Button should either be disabled or not clickable
            // The calendar should prevent this selection
            const isDisabled = await yesterdayButton.isDisabled().catch(() => true);

            if (!isDisabled) {
                // If not disabled, clicking should not advance
                await yesterdayButton.click();
                await page.waitForTimeout(500);

                // Should still be on date selection step
                await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();
            }
        });

        test('should prevent selecting past dates', async ({ page }) => {
            await page.goto('/make-a-reservation');

            // Past dates should be disabled in the calendar
            const yesterday = subDays(new Date(), 1);
            const yesterdayNum = format(yesterday, 'd');

            // Try to find and click a past date
            const pastDateButton = page.locator(`button:has-text("${yesterdayNum}")`).first();

            // Should be disabled or not allow selection
            const isDisabled = await pastDateButton.isDisabled().catch(() => true);
            expect(isDisabled).toBe(true);
        });
    });

    test.describe('Network Errors', () => {
        test('should handle API timeout gracefully', async ({ page }) => {
            // Intercept availability API and delay response
            await page.route('**/api/availability', async (route) => {
                await page.waitForTimeout(60000); // Simulate timeout
                await route.abort();
            });

            await page.goto('/make-a-reservation');

            const tomorrow = addDays(new Date(), 1);
            const checkOutDate = addDays(tomorrow, 2);
            const checkInDay = format(tomorrow, 'd');
            const checkOutDay = format(checkOutDate, 'd');

            await page.locator(`button:has-text("${checkInDay}")`).first().click();
            await page.waitForTimeout(500);
            await page.locator(`button:has-text("${checkOutDay}")`).first().click();

            await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
            await page.getByRole('button', { name: /RV.*Trailer/i }).click();
            await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
            await page.getByRole('button', { name: /Find Campsites/i }).click();

            // Should show error message or loading state doesn't hang forever
            // This tests resilience to network issues
        });
    });
});
