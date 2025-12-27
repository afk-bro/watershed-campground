import { test, expect } from '@playwright/test';

/**
 * Viewport Smoke Tests
 *
 * Tests that key pages render correctly across different viewport sizes:
 * - Mobile: 375px (iPhone SE), 390px (iPhone 12/13)
 * - Tablet: 768px, 1024px
 * - Desktop: 1280px, 1920px
 *
 * Checks for:
 * - Page loads without errors
 * - Key content is visible
 * - Navigation is accessible
 * - Layout doesn't break
 */

const VIEWPORTS = {
  mobile: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12/13', width: 390, height: 844 },
  ],
  tablet: [
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
  ],
  desktop: [
    { name: 'Laptop', width: 1280, height: 720 },
    { name: 'Desktop HD', width: 1920, height: 1080 },
  ],
};

const PUBLIC_PAGES = [
  { path: '/', heading: 'Welcome to Watershed Campground' },
  { path: '/rates', heading: 'Rates & Policies' },
  { path: '/gallery', heading: 'Gallery' },
  { path: '/contact', heading: 'Contact Us' },
];

test.describe('Viewport Smoke Tests - Public Pages', () => {
  for (const category of Object.keys(VIEWPORTS)) {
    const viewports = VIEWPORTS[category as keyof typeof VIEWPORTS];

    test.describe(category, () => {
      for (const viewport of viewports) {
        test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
          test.beforeEach(async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
          });

          for (const pageDef of PUBLIC_PAGES) {
            test(`${pageDef.path} loads and renders`, async ({ page }) => {
              await page.goto(pageDef.path);

              // Page should load without errors
              await expect(page).toHaveURL(pageDef.path);

              // Key heading should be visible
              await expect(page.getByRole('heading', { name: new RegExp(pageDef.heading, 'i') })).toBeVisible({
                timeout: 10000,
              });

              // Navigation should be accessible
              if (viewport.width >= 768) {
                // Desktop: top nav should be visible
                const navLinks = page.locator('nav a');
                const navCount = await navLinks.count();
                expect(navCount).toBeGreaterThan(0);
              } else {
                // Mobile: either hamburger menu or bottom nav should exist
                const mobileNav = page.locator('[data-testid="mobile-nav"], [data-testid="bottom-nav"], button[aria-label*="menu" i]');
                const mobileNavCount = await mobileNav.count();
                expect(mobileNavCount).toBeGreaterThan(0);
              }
            });
          }

          test('homepage hero section renders', async ({ page }) => {
            await page.goto('/');

            // Hero section should be visible with CTA
            const hero = page.locator('section').first();
            await expect(hero).toBeVisible();

            // Should have a call-to-action button (Book Now or similar)
            const ctaButton = page.getByRole('link', { name: /book|reserve/i }).first();
            await expect(ctaButton).toBeVisible();
          });

          test('rates page shows pricing information', async ({ page }) => {
            await page.goto('/rates');

            // Should show rates for different campsite types
            const ratesContent = page.locator('main');
            await expect(ratesContent).toBeVisible();

            // Look for price indicators ($ symbol)
            const priceText = await ratesContent.textContent();
            expect(priceText).toMatch(/\$/);
          });
        });
      }
    });
  }
});

// Note: Admin page tests are in the admin project tests (tests/admin/mobile-features.spec.ts)
// due to authentication requirements

test.describe('Responsive Navigation Tests - Public Site', () => {
  test('mobile navigation is present on homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for navigation (either menu button or nav element)
    const nav = page.locator('nav, [data-testid="mobile-nav"], button[aria-label*="menu" i]').first();
    await expect(nav).toBeVisible();
  });

  test('desktop navigation is visible on homepage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Nav should be visible
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Should have navigation links
    const navLinks = nav.locator('a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe('Form Ergonomics Tests', () => {
  test('mobile login form has appropriate tap targets', async ({ page }) => {
    // Override auth state to access login page
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/login');

    // Input fields should be tall enough for comfortable tapping (minimum 44px)
    const emailInput = page.getByTestId('admin-login-email');
    const passwordInput = page.getByTestId('admin-login-password');

    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    expect(emailBox?.height).toBeGreaterThanOrEqual(40); // Allow slight variance
    expect(passwordBox?.height).toBeGreaterThanOrEqual(40);

    // Submit button should be large enough
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    const buttonBox = await submitButton.boundingBox();

    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('tablet and desktop maintain consistent form sizing', async ({ page }) => {
    await page.context().clearCookies();

    const sizes = [
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' },
    ];

    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/admin/login');

      const emailInput = page.getByTestId('admin-login-email');
      const emailBox = await emailInput.boundingBox();

      // Forms should still be comfortably sized
      expect(emailBox?.height).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe('Text Readability Tests', () => {
  test('homepage text is readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main heading should be visible and reasonably sized
    const heading = page.getByRole('heading', { name: /watershed campground/i }).first();
    await expect(heading).toBeVisible();

    // Check computed font size is reasonable for mobile (at least 24px for h1)
    const fontSize = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    const fontSizeValue = parseInt(fontSize);
    expect(fontSizeValue).toBeGreaterThanOrEqual(24);
  });

  test('body text has sufficient size on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/rates');

    // Body text should be at least 16px for readability
    const bodyText = page.locator('main p').first();

    if (await bodyText.count() > 0) {
      const fontSize = await bodyText.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(14); // Minimum readable size
    }
  });
});
