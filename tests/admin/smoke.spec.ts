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
            await page.goto('/admin', { waitUntil: 'networkidle' });
            // Should redirect to login - wait for heading instead of just URL
            await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible({ timeout: 10000 });
            await expect(page).toHaveURL('/admin/login');
        });

        test('unauth user redirected from /admin/calendar to /admin/login', async ({ page }) => {
            await page.goto('/admin/calendar', { waitUntil: 'networkidle' });
            // Should redirect to login - wait for heading instead of just URL
            await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible({ timeout: 10000 });
            await expect(page).toHaveURL('/admin/login');
        });
    });

    test.describe('Authenticated', () => {
        // These tests use the auth state from auth.setup.ts

        test('/admin dashboard loads', async ({ page }) => {
            await page.goto('/admin', { waitUntil: 'networkidle' });
            // Wait for page to be fully loaded and interactive
            await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible({ timeout: 10000 });
        });

        test('/admin/calendar loads', async ({ page }) => {
            await page.goto('/admin/calendar', { waitUntil: 'networkidle' });
            // Calendar adds query params (month, year) - accept them
            await expect(page).toHaveURL(/\/admin\/calendar/);
            // Calendar should render - check for the Calendar link in the nav
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible({ timeout: 10000 });
        });

        test('/admin/campsites loads', async ({ page }) => {
            await page.goto('/admin/campsites', { waitUntil: 'networkidle' });
            await expect(page).toHaveURL('/admin/campsites');
            // Check for the Campsites heading
            await expect(page.getByRole('heading', { name: /Campsites/i })).toBeVisible({ timeout: 10000 });
        });
    });
});
