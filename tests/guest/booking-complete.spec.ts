import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

/**
 * Guest Happy Path: Complete Booking Flow
 * Tests the entire guest booking journey from availability check to payment confirmation.
 * This is the critical revenue-generating path - any regression here directly impacts business.
 */
test.describe('Guest Booking - Complete Happy Path', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Unauthenticated user

    test('should complete full booking with Stripe payment', async ({ page }) => {
        // ==========================================
        // STEP 1: Navigate to Reservation Page
        // ==========================================
        await page.goto('/make-a-reservation');

        // Verify wizard loads
        await expect(page.getByRole('heading', { name: 'Make a Reservation' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();

        // ==========================================
        // STEP 2: Select Dates (Wizard Step 1)
        // ==========================================
        // Select check-in date (tomorrow to avoid timezone issues)
        const tomorrow = addDays(new Date(), 1);
        const checkOutDate = addDays(tomorrow, 2); // 2-night stay

        // Click on available dates in the calendar
        // Note: This assumes the calendar shows available dates as clickable buttons
        // We'll select dates by finding buttons with the date numbers
        const checkInDay = format(tomorrow, 'd');
        const checkOutDay = format(checkOutDate, 'd');

        // Find and click check-in date
        await page.locator(`button:has-text("${checkInDay}")`).first().click();
        await page.waitForTimeout(500); // Brief pause for UI to update

        // Find and click check-out date
        await page.locator(`button:has-text("${checkOutDay}")`).first().click();

        // ==========================================
        // STEP 3: Select Parameters (Wizard Step 2)
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();

        // Guest count (default is 2, let's keep it)
        // Select RV/Trailer unit type
        await page.getByRole('button', { name: /RV.*Trailer/i }).click();

        // Enter RV length
        await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');

        // Click "Find Campsites"
        await page.getByRole('button', { name: /Find Campsites/i }).click();

        // ==========================================
        // STEP 4: Select Available Campsite (Wizard Step 3)
        // ==========================================
        // Wait for results to load
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });

        // Verify at least one campsite is available
        const bookButtons = page.getByRole('button', { name: /Book Now/i });
        await expect(bookButtons.first()).toBeVisible();

        // Store campsite details before booking
        const campsiteCard = page.locator('[class*="campsite"]').first();
        const campsiteName = await campsiteCard.getByRole('heading').textContent();

        // Click first available site
        await bookButtons.first().click();

        // ==========================================
        // STEP 5: Fill Personal Information Form
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

        // Verify date summary is correct
        await expect(page.getByText(new RegExp(format(tomorrow, 'MMM d')))).toBeVisible();
        await expect(page.getByText(new RegExp(format(checkOutDate, 'MMM d')))).toBeVisible();

        // Fill in personal details
        await page.getByPlaceholder('First Name').fill('Test');
        await page.getByPlaceholder('Last Name').fill('Playwright');
        await page.getByPlaceholder('Address Line 1').fill('123 Test Ave');
        await page.getByPlaceholder('City').fill('Vancouver');
        await page.getByPlaceholder('Postal Code').fill('V6B 1A1');
        await page.getByPlaceholder('Phone').fill('604-555-0100');
        await page.getByPlaceholder('Email').fill('test.playwright@example.com');

        // Select contact method
        await page.selectOption('select[name="contactMethod"]', 'Email');

        // Continue to add-ons
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

        // ==========================================
        // STEP 6: Add-ons (Optional)
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Enhance Your Stay' })).toBeVisible();

        // Option A: Skip add-ons and go directly to payment
        // Option B: Add some add-ons for testing
        // For this test, let's skip to checkout
        await page.getByRole('button', { name: /Review.*Pay/i }).click();

        // ==========================================
        // STEP 7: Review & Pay
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Review & Pay' })).toBeVisible({ timeout: 10000 });

        // Verify payment breakdown is visible
        await expect(page.getByText(/Site Cost/i)).toBeVisible();
        await expect(page.getByText(/Grand Total/i)).toBeVisible();
        await expect(page.getByText(/Due Now/i)).toBeVisible();

        // Extract total amount for later verification
        const totalText = await page.locator('text=/\\$[0-9]+\\.[0-9]{2}/').first().textContent();
        console.log('Total amount:', totalText);

        // ==========================================
        // STEP 8: Fill Stripe Payment Form
        // ==========================================
        // Wait for Stripe Elements to load
        const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 15000 });

        // Fill Stripe test card details
        // Using Stripe test card: 4242 4242 4242 4242
        await stripeFrame.locator('[name="number"]').fill('4242424242424242');
        await stripeFrame.locator('[name="expiry"]').fill('12/34');
        await stripeFrame.locator('[name="cvc"]').fill('123');
        await stripeFrame.locator('[name="postalCode"]').fill('12345');

        // Submit payment
        await page.getByRole('button', { name: /Pay/i }).click();

        // ==========================================
        // STEP 9: Verify Confirmation
        // ==========================================
        // Wait for success page (this may take a few seconds for Stripe processing)
        await expect(page.getByRole('heading', { name: /Reservation Confirmed/i })).toBeVisible({ timeout: 30000 });

        // Verify success message
        await expect(page.getByText(/Thank you.*Test/i)).toBeVisible();
        await expect(page.getByText(/received your payment/i)).toBeVisible();

        // Verify key details on confirmation page
        await expect(page.getByText(/test\.playwright@example\.com/i)).toBeVisible();

        // ==========================================
        // STEP 10: Verify Database State
        // ==========================================
        // Navigate to admin to verify reservation was created
        // (This requires admin auth, so we'll do this in a separate setup if needed)
        // For now, we've verified the UI flow completes successfully
    });

    test('should handle validation errors correctly', async ({ page }) => {
        await page.goto('/make-a-reservation');

        // Complete wizard to get to personal info form
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

        // Now on personal info form - try to submit without filling anything
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

        // Try to continue without filling required fields
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

        // Should show validation errors
        await expect(page.getByText(/required/i).first()).toBeVisible();

        // Fill in only first name and try again
        await page.getByPlaceholder('First Name').fill('Test');
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

        // Should still show validation errors for other fields
        await expect(page.getByText(/required/i).first()).toBeVisible();

        // Should NOT advance to next step
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
    });

    test('should allow changing dates from personal info form', async ({ page }) => {
        await page.goto('/make-a-reservation');

        // Complete date selection
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

        // On personal info form, click "Change" button to go back to wizard
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
        await page.getByRole('button', { name: /Change/i }).click();

        // Should be back at wizard
        await expect(page.getByRole('heading', { name: 'Make a Reservation' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();
    });
});
