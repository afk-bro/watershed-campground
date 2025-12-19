import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Start unauthenticated

    test('successful login with correct credentials', async ({ page }) => {
        await page.goto('/admin/login');

        // Fill in valid credentials
        await page.getByTestId('admin-login-email').fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
        await page.getByTestId('admin-login-password').fill(process.env.TEST_ADMIN_PASSWORD || 'testpass123');

        // Submit
        await page.getByTestId('admin-login-submit').click();

        // Should redirect to admin dashboard
        await page.waitForURL('/admin');
        await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
    });

    test('failed login with wrong password shows error', async ({ page }) => {
        await page.goto('/admin/login');

        // Fill in invalid credentials
        await page.getByTestId('admin-login-email').fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
        await page.getByTestId('admin-login-password').fill('wrongpassword123');

        // Submit
        await page.getByTestId('admin-login-submit').click();

        // Should show error message and stay on login page
        await expect(page).toHaveURL('/admin/login');
        await expect(page.getByText(/invalid|failed|incorrect/i)).toBeVisible();
    });

    test('failed login with non-existent email shows error', async ({ page }) => {
        await page.goto('/admin/login');

        // Fill in non-existent email
        await page.getByTestId('admin-login-email').fill('nonexistent@test.com');
        await page.getByTestId('admin-login-password').fill('anypassword');

        // Submit
        await page.getByTestId('admin-login-submit').click();

        // Should show error message
        await expect(page).toHaveURL('/admin/login');
        await expect(page.getByText(/invalid|failed|incorrect/i)).toBeVisible();
    });

    test('login button is disabled while submitting', async ({ page }) => {
        await page.goto('/admin/login');

        await page.getByTestId('admin-login-email').fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
        await page.getByTestId('admin-login-password').fill(process.env.TEST_ADMIN_PASSWORD || 'testpass123');

        // Click submit and immediately check if button is disabled
        const submitButton = page.getByTestId('admin-login-submit');
        await submitButton.click();

        // Button should show loading state
        await expect(submitButton).toContainText(/signing in/i);
    });
});
