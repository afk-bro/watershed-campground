import { test, expect } from '@playwright/test';

/**
 * Horizontal Overflow Detection Tests
 *
 * Ensures no content extends beyond the viewport width, which would cause
 * horizontal scrolling - a major UX issue on mobile devices.
 *
 * Strategy:
 * 1. Check document.documentElement.scrollWidth <= window.innerWidth
 * 2. Scan for elements with getBoundingClientRect().right > viewport width
 * 3. Test at multiple viewport sizes to catch responsive issues
 */

const CRITICAL_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12/13', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'Laptop', width: 1280, height: 720 },
];

const PAGES_TO_TEST = [
  { path: '/', name: 'Home' },
  { path: '/rates', name: 'Rates' },
  { path: '/gallery', name: 'Gallery' },
  { path: '/contact', name: 'Contact' },
];

test.describe('Horizontal Overflow - Public Pages', () => {
  for (const viewport of CRITICAL_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const pageDef of PAGES_TO_TEST) {
        test(`${pageDef.name} has no horizontal overflow`, async ({ page }) => {
          await page.goto(pageDef.path);

          // Wait for page to fully load and render
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500); // Allow for any animations/transitions

          // Method 1: Check document scroll width
          const hasDocumentOverflow = await page.evaluate(() => {
            const scrollWidth = document.documentElement.scrollWidth;
            const clientWidth = document.documentElement.clientWidth;
            return {
              scrollWidth,
              clientWidth,
              hasOverflow: scrollWidth > clientWidth,
            };
          });

          expect(hasDocumentOverflow.hasOverflow).toBe(false);
          if (hasDocumentOverflow.hasOverflow) {
            console.error(
              `Document overflow detected: scrollWidth=${hasDocumentOverflow.scrollWidth}, clientWidth=${hasDocumentOverflow.clientWidth}`
            );
          }

          // Method 2: Check body scroll width
          const hasBodyOverflow = await page.evaluate(() => {
            const scrollWidth = document.body.scrollWidth;
            const clientWidth = document.body.clientWidth;
            return {
              scrollWidth,
              clientWidth,
              hasOverflow: scrollWidth > clientWidth,
            };
          });

          expect(hasBodyOverflow.hasOverflow).toBe(false);
          if (hasBodyOverflow.hasOverflow) {
            console.error(
              `Body overflow detected: scrollWidth=${hasBodyOverflow.scrollWidth}, clientWidth=${hasBodyOverflow.clientWidth}`
            );
          }

          // Method 3: Check for elements extending beyond viewport
          const overflowingElements = await page.evaluate(() => {
            const viewportWidth = window.innerWidth;
            const allElements = Array.from(document.querySelectorAll('*'));
            const problematic: Array<{
              tag: string;
              id: string;
              classes: string;
              right: number;
              width: number;
            }> = [];

            for (const el of allElements) {
              const rect = el.getBoundingClientRect();

              // Skip hidden elements
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') {
                continue;
              }

              // Check if element extends beyond viewport
              // Allow 1px tolerance for rounding errors
              if (rect.right > viewportWidth + 1) {
                problematic.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || '(no id)',
                  classes: el.className.toString(),
                  right: rect.right,
                  width: rect.width,
                });
              }
            }

            return {
              viewportWidth,
              overflowingElements: problematic.slice(0, 10), // Limit to first 10 to avoid huge logs
            };
          });

          if (overflowingElements.overflowingElements.length > 0) {
            console.error('Elements extending beyond viewport:', overflowingElements);
          }

          expect(overflowingElements.overflowingElements.length).toBe(0);
        });
      }

      test('Navigation does not cause overflow', async ({ page }) => {
        await page.goto('/');

        // Check nav specifically
        const navOverflow = await page.evaluate(() => {
          const nav = document.querySelector('nav');
          if (!nav) return { hasNav: false, hasOverflow: false };

          const rect = nav.getBoundingClientRect();
          const viewportWidth = window.innerWidth;

          return {
            hasNav: true,
            hasOverflow: rect.right > viewportWidth + 1,
            navRight: rect.right,
            viewportWidth,
          };
        });

        if (navOverflow.hasNav) {
          expect(navOverflow.hasOverflow).toBe(false);
        }
      });
    });
  }
});

// Note: Admin page overflow tests are in tests/admin/mobile-features.spec.ts
// due to authentication requirements

test.describe('Horizontal Overflow - Dynamic Content', () => {
  test('Long text content wraps correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/rates');

    await page.waitForLoadState('networkidle');

    // Check that paragraphs don't overflow
    const textOverflow = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('main p');
      const viewportWidth = window.innerWidth;
      const overflowing: number[] = [];

      paragraphs.forEach((p, index) => {
        const rect = p.getBoundingClientRect();
        if (rect.right > viewportWidth + 1) {
          overflowing.push(index);
        }
      });

      return {
        viewportWidth,
        totalParagraphs: paragraphs.length,
        overflowingParagraphs: overflowing,
      };
    });

    expect(textOverflow.overflowingParagraphs.length).toBe(0);
  });
});

test.describe('Horizontal Overflow - Edge Cases', () => {
  test('Images do not cause overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/gallery');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow images to load

    const imageOverflow = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const viewportWidth = window.innerWidth;
      const overflowing: Array<{ src: string; right: number }> = [];

      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.right > viewportWidth + 1) {
          overflowing.push({
            src: img.src,
            right: rect.right,
          });
        }
      });

      return {
        viewportWidth,
        totalImages: images.length,
        overflowingImages: overflowing.slice(0, 5), // Limit output
      };
    });

    if (imageOverflow.overflowingImages.length > 0) {
      console.error('Overflowing images:', imageOverflow);
    }

    expect(imageOverflow.overflowingImages.length).toBe(0);
  });

  test('Buttons and CTAs fit within viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    const buttonOverflow = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a[role="button"], .btn');
      const viewportWidth = window.innerWidth;
      const overflowing: Array<{ text: string; right: number }> = [];

      buttons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);

        // Skip hidden buttons
        if (style.display === 'none' || style.visibility === 'hidden') {
          return;
        }

        if (rect.right > viewportWidth + 1) {
          overflowing.push({
            text: btn.textContent?.trim().substring(0, 50) || '(no text)',
            right: rect.right,
          });
        }
      });

      return {
        viewportWidth,
        totalButtons: buttons.length,
        overflowingButtons: overflowing,
      };
    });

    expect(buttonOverflow.overflowingButtons.length).toBe(0);
  });

  test('Forms fit within viewport on mobile', async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/login');

    const formOverflow = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return { hasForm: false, hasOverflow: false };

      const rect = form.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      return {
        hasForm: true,
        hasOverflow: rect.right > viewportWidth + 1,
        formRight: rect.right,
        viewportWidth,
      };
    });

    if (formOverflow.hasForm) {
      expect(formOverflow.hasOverflow).toBe(false);
    }
  });
});
