import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.test for E2E tests (local Supabase credentials)
dotenv.config({ path: '.env.test' });

/**
 * WSL-Specific Config
 * Uses 127.0.0.1 instead of localhost for reliability.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // Setup Project - runs auth.setup.ts before tests
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        // Main test project with auth state
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/admin.json', // Use authenticated state
            },
            dependencies: ['setup'], // Ensure setup runs first
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120 * 1000,
    },
});
