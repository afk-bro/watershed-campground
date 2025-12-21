import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/admin/login');

    // Fill in admin credentials from .env.test using stable data-testid selectors
    await page.getByTestId('admin-login-email').fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
    await page.getByTestId('admin-login-password').fill(process.env.TEST_ADMIN_PASSWORD || 'testpass123');

    // Submit the login form
    await page.getByTestId('admin-login-submit').click();

    // Wait for either successful redirect OR error message
    await Promise.race([
        page.waitForURL('/admin', { timeout: 10000 }),
        page.waitForSelector('.error-message', { timeout: 10000 }).then(async () => {
            const errorText = await page.locator('.error-message').textContent();
            throw new Error(`Login failed with error: ${errorText}`);
        })
    ]).catch(async (err) => {
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/auth-setup-failure.png', fullPage: true });
        console.log('Current URL:', page.url());
        console.log('Page content:', await page.content());
        throw err;
    });

    // Verify we're logged in by checking for admin content
    await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

    // Save signed-in state to 'tests/.auth/admin.json'
    await page.context().storageState({ path: authFile });
});
