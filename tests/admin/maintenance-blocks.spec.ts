import { test, expect } from '@playwright/test';

/**
 * Maintenance Blocks E2E Tests
 *
 * Prerequisites: These tests assume maintenance blocks/blackout dates exist in the database.
 * Run with a local Supabase instance that has seed data including blackout dates.
 */
test.describe('Maintenance Blocks', () => {

    test('maintenance tab shows correct count', async ({ page }) => {
        await page.goto('/admin');

        // Wait for data to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Find the maintenance tab and check it has a count
        const maintenanceTab = page.getByRole('button', { name: /🛠️ Maintenance/i });
        await expect(maintenanceTab).toBeVisible();

        // Check that the count is displayed in format (X)
        await expect(maintenanceTab).toContainText(/\(\d+\)/);
    });

    test('maintenance rows render with correct styling', async ({ page }) => {
        await page.goto('/admin');

        // Wait for data to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Click the maintenance tab
        const maintenanceTab = page.getByRole('button', { name: /🛠️ Maintenance/i });
        await maintenanceTab.click();

        // Wait for filter to apply
        await page.waitForTimeout(500);

        // Check if there are any maintenance rows
        const rowCount = await page.locator('tbody tr').count();

        if (rowCount > 0) {
            // Get the first maintenance row
            const maintenanceRow = page.locator('tbody tr').first();

            // Check for "Maintenance Block" text
            await expect(maintenanceRow.locator('text=Maintenance Block')).toBeVisible();

            // Check for "Blocked" status pill
            await expect(maintenanceRow.locator('text=Blocked')).toBeVisible();
        } else {
            test.skip();
        }
    });

    test('maintenance row checkboxes are disabled', async ({ page }) => {
        await page.goto('/admin');

        // Wait for data to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Click the maintenance tab
        const maintenanceTab = page.getByRole('button', { name: /🛠️ Maintenance/i });
        await maintenanceTab.click();

        // Wait for filter to apply
        await page.waitForTimeout(500);

        // Check if there are any maintenance rows
        const rowCount = await page.locator('tbody tr').count();

        if (rowCount > 0) {
            // Get all checkboxes in maintenance rows
            const checkboxes = page.locator('tbody tr input[type="checkbox"]');
            const count = await checkboxes.count();

            // Verify all checkboxes are disabled
            for (let i = 0; i < count; i++) {
                await expect(checkboxes.nth(i)).toBeDisabled();
            }
        } else {
            test.skip();
        }
    });

    test('select all only selects reservations, not maintenance', async ({ page }) => {
        await page.goto('/admin');

        // Wait for data to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Make sure we're on the "All" tab
        const allTab = page.getByRole('button', { name: /^All/i });
        await allTab.click();
        await page.waitForTimeout(500);

        // Click the "select all" checkbox
        const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
        await selectAllCheckbox.click();

        // Wait for selection to update
        await page.waitForTimeout(500);

        // Check if the bulk action bar appears (only appears if something is selected)
        const bulkBar = page.locator('text=Selected').first();
        const isBulkBarVisible = await bulkBar.isVisible().catch(() => false);

        if (isBulkBarVisible) {
            // If bulk bar is visible, verify only reservations are selected
            // (maintenance checkboxes should be disabled and not selected)

            // Get all disabled checkboxes (maintenance rows)
            const disabledCheckboxes = page.locator('tbody tr input[type="checkbox"]:disabled');
            const disabledCount = await disabledCheckboxes.count();

            // Verify none of the disabled checkboxes are checked
            for (let i = 0; i < disabledCount; i++) {
                await expect(disabledCheckboxes.nth(i)).not.toBeChecked();
            }
        }
    });
});
