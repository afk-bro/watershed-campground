import { test, expect } from '@playwright/test';

test.describe('Admin Smoke Tests', () => {
    test.describe('Unauthenticated', () => {
        test.use({ storageState: { cookies: [], origins: [] } }); // Override auth state to test unauth behavior

        test('/admin/login loads', async ({ page }) => {
            await page.goto('/admin/login');
            await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
            await expect(page.getByTestId('admin-login-email')).toBeVisible();
            await expect(page.getByTestId('admin-login-password')).toBeVisible();
        });

        test('unauth user redirected from /admin to /admin/login', async ({ page }) => {
            await page.goto('/admin');
            // Should redirect to login
            await page.waitForURL('/admin/login');
            await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
        });

        test('unauth user redirected from /admin/reservations to /admin/login', async ({ page }) => {
            await page.goto('/admin/reservations');
            await page.waitForURL('/admin/login');
            await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
        });
    });

    test.describe('Authenticated', () => {
        // These tests use the auth state from auth.setup.ts

        test('/admin dashboard loads', async ({ page }) => {
            await page.goto('/admin');
            await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
        });

        test('/admin/reservations loads', async ({ page }) => {
            await page.goto('/admin/reservations');
            // Should show reservations page (not redirect)
            await expect(page).toHaveURL('/admin/reservations');
            // Look for reservations-related content
            await expect(page.getByText(/reservations/i)).toBeVisible();
        });

        test('/admin/calendar loads', async ({ page }) => {
            await page.goto('/admin/calendar');
            await expect(page).toHaveURL('/admin/calendar');
            // Calendar should render - check for the Calendar link in the nav
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        });

        test('/admin/campsites loads', async ({ page }) => {
            await page.goto('/admin/campsites');
            await expect(page).toHaveURL('/admin/campsites');
            await expect(page.getByText(/campsites/i)).toBeVisible();
        });
    });
});
