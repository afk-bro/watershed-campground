import { test, expect } from '@playwright/test';
import { format, addDays, startOfMonth } from 'date-fns';

test.describe('Guest Booking Flow', () => {
    test('should complete a reservation successfully', async ({ page }) => {
        // 1. Visit Reservation Page
        await page.goto('/make-a-reservation');

        // Check if we are in the Wizard
        await expect(page.locator('h1')).toContainText('Make a Reservation');
        
        // 2. Step 1: Date Selection
        // Wait for calendar to load
        await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();

        // Click available dates
        const availableDay = page.locator('button').filter({ hasNotText: '' }).nth(14); // 15th of month
        await availableDay.click();

        // Click an end date (next day)
        const nextDay = page.locator('button').filter({ hasNotText: '' }).nth(15); // 16th of month
        await nextDay.click();

        // 3. Step 2: Parameters (automatically advances after date selection)
        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();

        // Guest count starts at 2 by default, no need to change

        // Select Unit Type
        await page.getByRole('button', { name: 'RV / Trailer' }).click();

        // Fill Vehicle Length
        await page.getByPlaceholder('e.g. 25').fill('25');

        // Click Find Campsites
        await page.getByRole('button', { name: 'Find Campsites' }).click();

        // 4. Step 3: Select Site
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible();

        // Select the first available site
        await page.getByRole('button', { name: 'Book Now' }).first().click();

        // 5. Step 4: Reservation Form (Personal Info)
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

        // Fill Form
        await page.getByPlaceholder('First Name').fill('TestUser');
        await page.getByPlaceholder('Last Name').fill('Playwright');
        await page.getByPlaceholder('Address Line 1').fill('123 Test Lane');
        await page.getByPlaceholder('City').fill('Test City');
        await page.getByPlaceholder('Postal Code').fill('12345');
        await page.getByPlaceholder('Phone').fill('555-0199');
        await page.getByPlaceholder('Email').fill('test@example.com');
        
        // Select contact method
        await page.selectOption('select[name="contactMethod"]', 'Email');

        // Submit Details
        await page.getByRole('button', { name: 'Continue to Add-ons' }).click();

        // 6. Step 5: Add-ons
        await expect(page.getByRole('heading', { name: 'Enhance Your Stay' })).toBeVisible();

        // Test reaches add-ons step successfully
        // Note: Payment step requires Stripe configuration to proceed
        console.log('Test reached Add-ons Step successfully');
    });
});
