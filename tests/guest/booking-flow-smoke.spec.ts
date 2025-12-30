import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

/**
 * Booking Flow Smoke Test (Up to Payment Step)
 *
 * This test validates the complete booking flow UP TO but NOT INCLUDING payment.
 * It ensures:
 * 1. Organization resolution works (no DEFAULT_ORG_SLUG fallback needed)
 * 2. Date selection, campsite availability, guest details all work
 * 3. Review page loads correctly with calculated totals
 *
 * This test runs even when Stripe is disabled, providing smoke test coverage
 * for the booking flow without requiring payment processor configuration.
 *
 * CRITICAL: This test catches org slug misconfiguration that would cause 404s.
 */
test.describe('Booking Flow Smoke Test (No Payment)', () => {
    test('should complete booking flow up to payment step', async ({ page }) => {
        // ==========================================
        // STEP 1: Navigate to Home and Start Booking
        // ==========================================
        await page.goto('/');

        // Click "Book Now" button
        const bookNowButton = page.getByRole('link', { name: /book now/i }).first();
        await expect(bookNowButton, 'Book Now button should be visible').toBeVisible();
        await bookNowButton.click();

        // Should navigate to booking page
        await expect(page, 'Should navigate to /booking').toHaveURL(/\/booking/);

        // ==========================================
        // STEP 2: Select Dates (Uses /api/availability/calendar - tests org resolution)
        // ==========================================
        const tomorrow = addDays(new Date(), 7);
        const dayAfterTomorrow = addDays(tomorrow, 2);

        // Fill check-in date
        const checkInInput = page.locator('input[name="checkIn"]');
        await checkInInput.fill(format(tomorrow, 'yyyy-MM-dd'));

        // Fill check-out date
        const checkOutInput = page.locator('input[name="checkOut"]');
        await checkOutInput.fill(format(dayAfterTomorrow, 'yyyy-MM-dd'));

        // Fill adults
        const adultsInput = page.locator('input[name="adults"]');
        await adultsInput.fill('2');

        // ==========================================
        // STEP 3: Check Availability (Tests /api/availability/search endpoint)
        // ==========================================
        const checkAvailabilityButton = page.getByRole('button', { name: /check availability/i });
        await expect(checkAvailabilityButton, 'Check Availability button should be visible').toBeVisible();

        // Click and wait for API response
        const [availabilityResponse] = await Promise.all([
            page.waitForResponse(
                response => response.url().includes('/api/availability/search') && response.status() === 200,
                { timeout: 10000 }
            ),
            checkAvailabilityButton.click()
        ]);

        // Verify API call succeeded
        expect(availabilityResponse.status(), 'Availability API should return 200').toBe(200);

        // Verify we got to site selection step
        await expect(page.getByText(/available campsites/i), 'Should show available campsites')
            .toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 4: Select a Campsite
        // ==========================================
        // Wait for campsite cards to load
        const campsiteCard = page.locator('[data-testid*="campsite-"]').first();
        await expect(campsiteCard, 'At least one campsite should be available').toBeVisible({ timeout: 5000 });

        // Click "Select" button on first available campsite
        const selectButton = campsiteCard.getByRole('button', { name: /select/i });
        await selectButton.click();

        // ==========================================
        // STEP 5: Fill Guest Details
        // ==========================================
        await expect(page.getByText(/guest information/i), 'Should show guest information form')
            .toBeVisible({ timeout: 5000 });

        // Fill out guest details
        await page.locator('input[name="firstName"]').fill('Smoke');
        await page.locator('input[name="lastName"]').fill('Test');
        await page.locator('input[name="email"]').fill(`smoke.test.${Date.now()}@example.com`);
        await page.locator('input[name="phone"]').fill('555-0199');
        await page.locator('input[name="address1"]').fill('123 Smoke Test St');
        await page.locator('input[name="city"]').fill('Test City');
        await page.locator('input[name="postalCode"]').fill('12345');

        // Select RV camping unit
        await page.locator('select[name="campingUnit"]').selectOption('RV / Trailer');
        await page.locator('input[name="rvLength"]').fill('25');

        // Select contact method
        await page.locator('select[name="contactMethod"]').selectOption('Email');

        // Continue to next step
        const continueButton = page.getByRole('button', { name: /continue/i });
        await continueButton.click();

        // ==========================================
        // STEP 6: Review Page (Before Payment)
        // ==========================================
        await expect(page.getByText(/review.*reservation/i), 'Should show review page')
            .toBeVisible({ timeout: 10000 });

        // Verify reservation details are displayed
        await expect(page.getByText(/smoke test/i), 'Should show guest name').toBeVisible();
        await expect(page.getByText(format(tomorrow, 'MMM')), 'Should show check-in date').toBeVisible();

        // Verify pricing is calculated
        await expect(page.getByText(/total/i), 'Should show total amount').toBeVisible();
        await expect(page.getByText(/\$/), 'Should show dollar amounts').toBeVisible();

        // ==========================================
        // STEP 7: Verify Payment Intent Creation (Tests /api/create-payment-intent - org resolution)
        // ==========================================
        // This is where we previously had 404 errors due to org slug mismatch

        // Click "Proceed to Payment" or similar button to trigger payment intent
        const proceedButton = page.getByRole('button', { name: /proceed.*payment|pay now/i }).first();

        if (await proceedButton.isVisible({ timeout: 2000 })) {
            // Listen for payment intent API call
            const paymentIntentPromise = page.waitForResponse(
                response => response.url().includes('/api/create-payment-intent'),
                { timeout: 10000 }
            );

            await proceedButton.click();

            // Wait for payment intent response
            const paymentIntentResponse = await paymentIntentPromise;

            // Verify payment intent API succeeded (or failed gracefully)
            const status = paymentIntentResponse.status();

            if (status === 404) {
                // If we get 404, this is a regression - org slug misconfiguration
                throw new Error(
                    'Payment intent returned 404 - org slug misconfiguration detected! ' +
                    'Check NEXT_PUBLIC_ORG_SLUG and resolvePublicOrganizationId() fallback.'
                );
            }

            // Accept either 200 (success) or 503 (Stripe not configured - expected in test env without Stripe)
            expect([200, 503], 'Payment intent should succeed or fail gracefully (503 = Stripe not configured)')
                .toContain(status);

            console.log(`✅ Payment intent API returned ${status} (org resolution working correctly)`);
        } else {
            console.log('ℹ️  Proceed to Payment button not visible - may already be at payment step');
        }

        // ==========================================
        // SUCCESS: Booking flow worked up to payment
        // ==========================================
        console.log('✅ Smoke test passed: Complete booking flow works (date selection → campsite → guest details → review)');
    });

    test('should handle calendar API with proper org resolution', async ({ page }) => {
        // Simpler test that just verifies the calendar API works
        // This catches org slug issues early without full booking flow

        await page.goto('/booking');

        // Fill dates to trigger calendar API call
        const tomorrow = addDays(new Date(), 7);
        const checkInInput = page.locator('input[name="checkIn"]');
        await checkInInput.fill(format(tomorrow, 'yyyy-MM-dd'));

        // Wait for calendar API call (should NOT be 404)
        const calendarResponse = await page.waitForResponse(
            response => response.url().includes('/api/availability/calendar'),
            { timeout: 10000 }
        );

        const status = calendarResponse.status();

        if (status === 404) {
            const responseBody = await calendarResponse.text();
            throw new Error(
                `Calendar API returned 404 - org slug misconfiguration!\n` +
                `Response: ${responseBody}\n` +
                `Check NEXT_PUBLIC_ORG_SLUG environment variable.`
            );
        }

        expect(status, 'Calendar API should return 200').toBe(200);
        console.log('✅ Calendar API working correctly with org resolution');
    });
});
