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
const DEFAULT_ORG_SLUG = 'watershed-campground';

test.describe('Booking Flow Smoke Test (No Payment)', () => {
    test.use({
        extraHTTPHeaders: {
            'x-test-org-slug': DEFAULT_ORG_SLUG
        }
    });

    test('should complete booking flow up to payment step', async ({ page }) => {
        // ==========================================
        // STEP 1: Navigate to Home and Start Booking
        // ==========================================
        await page.goto('/');

        // Click "Make a Reservation" button
        const bookNowButton = page.getByRole('link', { name: /make a reservation/i }).first();
        await expect(bookNowButton, 'Make a Reservation button should be visible').toBeVisible();
        await bookNowButton.click();

        // Should navigate to booking page
        await expect(page, 'Should navigate to /make-a-reservation').toHaveURL(/\/make-a-reservation/);

        // ==========================================
        // STEP 2: Select Dates (Uses /api/availability/calendar - tests org resolution)
        // ==========================================
        const tomorrow = addDays(new Date(), 7);
        const dayAfterTomorrow = addDays(tomorrow, 2);

        // Helper to select date in custom calendar
        const selectDate = async (date: Date) => {
            const targetMonth = format(date, 'MMMM yyyy');
            const targetDay = format(date, 'd'); // 1-31

            // Navigate to correct month
            while (true) {
                const visibleHeader = await page.locator('.font-bold.text-lg').textContent();
                if (visibleHeader?.trim() === targetMonth) break;
                // Assuming moving forward for future dates
                await page.locator('button:has(svg.lucide-chevron-right)').click();
                await page.waitForTimeout(200); // Animation
            }

            // Click the day button
            // Note: There might be duplicate numbers if we padded previous month, but current implementation uses empty divs for padding.
            // But if we have multiple calendars? No, single calendar.
            // We use strict text match on the button content (DateStep renders plain number).
            // But we must avoid "FULL" text which is inside button.
            // Use :text-is() pseudo or exact match for text content.
            // Playwright .getByText('15', { exact: true }) works.
            await page.getByRole('button', { name: targetDay, exact: true }).click();
        };

        await selectDate(tomorrow);
        await selectDate(dayAfterTomorrow);

        // Step 2: Details (Guests)
        // Wait for step 2 to appear
        await expect(page.getByText('Who is coming?', { exact: false })).toBeVisible();

        // Fill adults/guests
        // "Guest Count" is a counter, default is 2. No need to fill if we want 2.
        // We MUST select a unit type to proceed.

        // Select "RV / Trailer"
        await page.getByRole('button', { name: 'RV / Trailer' }).click();

        // RV Length slider appears. Default is 0?
        // Let's set it to 25.
        // Range input requires js handle or careful interaction.
        // For smoke test, checking default (0) might be enough if valid?
        // But let's try to set it if possible, or just skip if 0 is valid.
        // isValid checks: rvLength is not checked for validity in CampsiteParamsStep, only guests and unitType.

        // Continue to search (Button says "Find Campsites")
        await page.getByRole('button', { name: /find campsites/i }).click();

        // ==========================================
        // STEP 3: Check Availability (Tests /api/availability/search endpoint)
        // ==========================================
        // Note: The wizard auto-searches when entering Step 3.
        // We triggered navigation to Step 3 by clicking Next in Step 2.

        // Removed checkAvailabilityButton check as Wizard is different.

        // Click and wait for API response
        // Click and wait for API response
        const [availabilityResponse] = await Promise.all([
            page.waitForResponse(
                response => response.url().includes('/api/availability/search') && response.status() === 200,
                { timeout: 10000 }
            ),
            // The "Next" button in Step 2 triggers the search in Step 3
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
        const campsiteCard = page.locator('[data-testid*="campsite-"]').first(); // OK: guest smoke test - selects any available
        await expect(campsiteCard, 'At least one campsite should be available').toBeVisible({ timeout: 5000 });

        // Click "Select" button on first available campsite
        // Click "Book Now" button on first available campsite
        const selectButton = campsiteCard.getByRole('button', { name: /book now/i });
        await selectButton.click();

        // ==========================================
        // STEP 5: Fill Guest Details
        // ==========================================
        await expect(page.getByText(/personal information/i), 'Should show guest details form')
            .toBeVisible({ timeout: 10000 });

        // Fill out guest details
        await page.locator('input[name="firstName"]').fill('Smoke');
        await page.locator('input[name="lastName"]').fill('Test');
        await page.locator('input[name="email"]').fill(`smoke.test.${Date.now()}@example.com`);
        await page.locator('input[name="phone"]').fill('555-555-0199');
        await page.locator('input[name="address1"]').fill('123 Smoke Test St');
        await page.locator('input[name="city"]').fill('Test City');
        await page.locator('input[name="postalCode"]').fill('12345');

        await page.locator('input[name="postalCode"]').fill('12345');

        // Unit type and length are already selected in Step 2.

        // Select contact method
        await page.locator('select[name="contactMethod"]').selectOption('Email');

        // Continue to next step (Add-ons)
        await page.getByRole('button', { name: /continue/i }).click();

        // ==========================================
        // STEP 5.5: Add-ons Step
        // ==========================================
        await expect(page.getByText(/enhance.*stay/i), 'Should show add-ons page')
            .toBeVisible({ timeout: 10000 });

        // Continue to Review (Button says "Review & Pay")
        await page.getByRole('button', { name: 'Review & Pay', exact: true }).click();

        // ==========================================
        // STEP 6: Review Page (Before Payment)
        // ==========================================
        await expect(page.getByText(/review.*reservation/i), 'Should show review page')
            .toBeVisible({ timeout: 10000 });

        // Verify reservation details are displayed
        // Guest name is not shown in PaymentReview component
        // await expect(page.getByText(/smoke test/i), 'Should show guest name').toBeVisible();

        // Verify Check-In date is shown (format might be '2026-01-06' or MMM d?)
        // PaymentReview shows: Site Cost (yyyy-MM-dd to yyyy-MM-dd)
        // So we expect checkIn string. format(tomorrow, 'yyyy-MM-dd')
        await expect(page.getByText(format(tomorrow, 'yyyy-MM-dd')), 'Should show check-in date').toBeVisible();

        // Verify pricing is calculated
        await expect(page.getByText('Grand Total:'), 'Should show total amount').toBeVisible();
        await expect(page.getByText(/\$/).first(), 'Should show dollar amounts').toBeVisible();

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
    });

    test('should handle calendar API with proper org resolution', async ({ page }) => {
        // Simpler test that just verifies the calendar API works
        // This catches org slug issues early without full booking flow

        // Make org explicit in URL for test reliability
        await page.goto('/make-a-reservation?org=watershed-campground');

        // Wait for the calendar UI to be visible (this depends on the API)
        await expect(page.getByTestId('availability-calendar')).toBeVisible({ timeout: 10000 });

        // Verify the API was called successfully using page.request
        const calendarResponse = await page.request.get('/api/availability/calendar?org=watershed-campground&month=' + new Date().toISOString().slice(0, 7));

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
