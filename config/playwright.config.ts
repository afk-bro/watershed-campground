import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.test for E2E tests (local Supabase credentials)
// This ensures tests use the local Supabase instance, not production
dotenv.config({ path: '.env.test' });

// Debug: Verify env vars are present (for CI troubleshooting)
if (process.env.CI) {
    console.log("CI env present:", {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
}

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // ============================================
        // Setup Project
        // ============================================
        // Runs once before all tests to authenticate and save session
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },

        // ============================================
        // Admin Test Suite
        // ============================================
        // Tests requiring admin authentication
        {
            name: 'admin',
            testMatch: /tests\/admin\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/admin.json', // Use authenticated state
            },
            dependencies: ['setup'],
        },

        // ============================================
        // Guest Test Suite
        // ============================================
        // Public-facing tests (no auth required)
        {
            name: 'guest',
            testMatch: /tests\/guest\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: { cookies: [], origins: [] }, // No auth state
            },
        },

        // ============================================
        // All Tests (Default)
        // ============================================
        // Runs all tests with appropriate auth state
        {
            name: 'chromium',
            testMatch: /tests\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                // Admin tests will override this in their describe blocks
                storageState: 'tests/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        // Use dev server for E2E tests - Stripe works better in dev mode
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...Object.fromEntries(
                // Pass all loaded env vars from .env.local to the webServer, filtering out undefined
                Object.entries(process.env).filter(([, v]) => v !== undefined)
            ),
            // Fast failsafe timeout for tests (500ms instead of 10s in production)
            NEXT_PUBLIC_STUCK_SAVING_TIMEOUT_MS: '500',
        } as Record<string, string>,
    },
});
