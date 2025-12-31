import { test, expect } from '@playwright/test';

/**
 * Environment Configuration Validation Tests
 *
 * These tests verify that required environment variables are properly configured
 * and catch configuration drift between test/dev/CI environments.
 *
 * This prevents the scenario where tests pass with .env.test but manual testing
 * fails with .env.local due to missing or misconfigured variables.
 */
test.describe('Environment Configuration', () => {
    test('should have all required NEXT_PUBLIC_* variables set', async ({ page }) => {
        // Navigate to a page to get access to public env vars
        await page.goto('/');

        // Evaluate environment variables in browser context
        const publicEnv = await page.evaluate(() => {
            return {
                NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                NEXT_PUBLIC_ORG_SLUG: process.env.NEXT_PUBLIC_ORG_SLUG,
            };
        });

        // Verify required public vars are set
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL must be set')
            .toBeTruthy();
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
            .toMatch(/^https?:\/\/.+/);

        expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
            .toBeTruthy();
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!.length, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty')
            .toBeGreaterThan(10);

        expect(publicEnv.NEXT_PUBLIC_ORG_SLUG, 'NEXT_PUBLIC_ORG_SLUG must be set')
            .toBeTruthy();
        expect(publicEnv.NEXT_PUBLIC_ORG_SLUG, 'NEXT_PUBLIC_ORG_SLUG must match expected test org')
            .toBe('watershed-campground');
    });

    test('should have required server-side variables accessible via API', async ({ request }) => {
        // Hit a debug endpoint to verify server-side config
        // We'll create a simple health check endpoint for this
        const response = await request.get('/api/health');

        expect(response.ok(), 'Health check should succeed with proper server config').toBe(true);

        const data = await response.json();

        // Verify critical config is present
        expect(data.configured, 'Server should report as configured').toBe(true);
        expect(data.org_slug, 'Server should have org_slug configured').toBe('watershed-campground');
    });

    test('should have consistent org slug across client and server', async ({ page, request }) => {
        // Get client-side org slug
        await page.goto('/');
        const clientOrgSlug = await page.evaluate(() => {
            return process.env.NEXT_PUBLIC_ORG_SLUG;
        });

        // Get server-side org slug via API
        const response = await request.get('/api/health');
        const serverData = await response.json();

        expect(clientOrgSlug, 'Client and server org slugs must match')
            .toBe(serverData.org_slug);
        expect(clientOrgSlug, 'Org slug must be watershed-campground')
            .toBe('watershed-campground');
    });

    test('should not use placeholder values from .env.example', async ({ page }) => {
        await page.goto('/');

        const publicEnv = await page.evaluate(() => {
            return {
                NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            };
        });

        // Verify no placeholder values
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL, 'Should not use placeholder Supabase URL')
            .not.toContain('your-project');
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Should not use placeholder anon key')
            .not.toContain('your-anon-key');
        expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Should not use placeholder publishable key')
            .not.toContain('your-publishable-key');
    });

    test('should have admin emails configured for test environment', async ({ request }) => {
        // This test ensures ADMIN_EMAILS is set, preventing 403 errors in admin routes
        // We verify by checking if admin API endpoints are accessible with proper auth

        const response = await request.get('/api/health');
        const data = await response.json();

        expect(data.has_admin_emails, 'ADMIN_EMAILS must be configured')
            .toBe(true);
    });
});
