import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { supabaseAdmin } from './helpers/test-supabase';

const authFile = path.join(__dirname, '.auth/admin.json');

setup('verify seed data exists', async () => {
    // Fail fast if seed data is missing - prevents cascading failures
    // This catches "forgot to run npm run test:db:reset" BEFORE running 76+ tests

    const { data: campsites, error: campsiteError } = await supabaseAdmin
        .from('campsites')
        .select('code')
        .in('code', ['S1', 'S2', 'S3', 'S4', 'S5', 'C1', 'C2']);

    if (campsiteError || !campsites || campsites.length < 7) {
        throw new Error(
            `❌ SEED DATA MISSING: Expected 7 test campsites, found ${campsites?.length || 0}!\n\n` +
            'Run: npm run test:db:reset\n\n' +
            'This check prevents cascading test failures (76+ tests failing).\n' +
            'Better to fail here with a clear message than mysteriously later.'
        );
    }

    // Check for test reservations by their known emails
    const { data: reservations, error: reservationError } = await supabaseAdmin
        .from('reservations')
        .select('email')
        .in('email', ['john.doe@test.com', 'jane.smith@test.com', 'bob.johnson@test.com']);

    if (reservationError || !reservations || reservations.length < 3) {
        throw new Error(
            `❌ SEED DATA MISSING: Expected 3 test reservations, found ${reservations?.length || 0}!\n\n` +
            'Run: npm run test:db:reset\n\n' +
            'This check prevents cascading test failures.'
        );
    }

    console.log('✓ Seed data verified:');
    console.log(`  - ${campsites.length} campsites (S1-S5, C1-C2)`);
    console.log(`  - ${reservations.length} test reservations`);
    console.log('  - Admin auth will be verified in next setup step');
});

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
