import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.test for E2E tests (test project credentials)
// This loads credentials for the hosted test project or local overrides if you opt into them
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
    workers: process.env.CI ? 1 : 2,
    reporter: 'html',
    globalSetup: require.resolve('../tests/global-setup'),
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Leak-proof settings to prevent zombie Chrome processes
        headless: true,
        actionTimeout: 15000,
        navigationTimeout: 15000,
        launchOptions: {
            args: [
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ],
        },
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
            testMatch: /admin\/.*\.spec\.ts/,
            testIgnore: [
                '**/admin/mobile-*.spec.ts',
                '**/admin/responsive-reservations.spec.ts'
            ],
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
            testMatch: /guest\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: { cookies: [], origins: [] }, // No auth state
            },
        },

        // ============================================
        // Mobile (touch) Project
        // ============================================
        // Runs mobile-specific tests with touch enabled
        {
            name: 'mobile-chrome',
            testMatch: [
                '**/admin/mobile-*.spec.ts',
                '**/admin/responsive-reservations.spec.ts'
            ],
            use: {
                ...devices['Pixel 5'],
                hasTouch: true,
                isMobile: true,
                viewport: devices['Pixel 5'].viewport,
                storageState: 'tests/.auth/admin.json',
            },
            dependencies: ['setup'],
        },

        // ============================================
        // Shared Tests (Integration, Security, Unit)
        // ============================================
        // Tests that don't fit admin/guest categories
        {
            name: 'shared',
            testMatch: [
                /integration\/.*\.spec\.ts/,
                /security\/.*\.spec\.ts/,
                /unit\/.*\.spec\.ts/,
            ],
            use: {
                ...devices['Desktop Chrome'],
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
            // Disable rate limiting during E2E to prevent 429s
            RATE_LIMIT_DISABLED: 'false', // Enable for security tests, high limits used elsewhere.
            NEXT_PUBLIC_STUCK_SAVING_TIMEOUT_MS: '500',
        } as Record<string, string>,
    },
});
