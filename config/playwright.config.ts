import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.test for E2E tests (local Supabase credentials)
// Playwright runs from project root via symlink, so .env.test is in same directory
dotenv.config({ path: '.env.test' });

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
            // Pass all loaded env vars from .env.test to the webServer
            ...process.env,
            // Force test mode for Next.js
            NODE_ENV: 'test',
        },
    },
});
