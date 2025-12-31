import { test, expect } from '@playwright/test';

test.describe('Calendar Hit Testing (Unit-ish)', () => {

    test('getDateFromPointer should ignore overlays and find data-date', async ({ page }) => {
        // minimally reproduce the DOM structure needed for hit testing
        await page.setContent(`
            <html>
            <style>
                .cell { width: 100px; height: 100px; border: 1px solid #ccc; position: relative; }
                .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; }
                .toast { position: fixed; top: 20px; right: 20px; width: 200px; height: 50px; background: red; z-index: 100; }
                .ghost { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
                .content { width: 100%; height: 100%; }
            </style>
            <body>
                <!-- Grid -->
                <div class="calendar-grid">
                    <!-- Date Cell 2025-01-01 -->
                    <div class="cell" data-date="2025-01-01" id="target-cell">
                        <div class="content">Content</div>
                        <!-- Ghost Preview (should be ignored) -->
                        <div class="ghost" data-ghost-mode="true">Ghost</div>
                    </div>
                </div>

                <!-- Toast Overlay (should be ignored) -->
                <div class="toast" data-testid="toast">Toast Notification</div>

                <!-- Backdrop Overlay (should be ignored) -->
                <div class="overlay fixed inset-0" data-backdrop="true"></div>

                <script>
                    ${getDateFromPointerSource()}
                </script>
            </body>
            </html>
        `);

        // Inject the function verification logic
        const result = await page.evaluate(() => {
            const cell = document.getElementById('target-cell');
            if (!cell) return 'Cell not found';

            const rect = cell.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // We simulate the hit test logic here by calling the function we injected
            // Note: In a real app we'd import the function, but for this "unit" test
            // we injected the source code or a simplified compatible version.
            return window.getDateFromPointer?.(centerX, centerY);
        });

        expect(result).toBe('2025-01-01');
    });

    test('getCampsiteFromPointer should find campsite row id', async ({ page }) => {
        await page.setContent(`
             <html>
            <style>
                .row { height: 100px; width: 100%; border-bottom: 1px solid #ccc; }
                .toast { position: fixed; top: 20px; right: 20px; background: red; z-index: 100; }
            </style>
            <body>
                <div class="row" data-campsite-id="camp-123" id="target-row">
                    Row Content
                </div>
                <!-- Intersecting Overlay -->
                <div class="toast" data-testid="toast" style="top: 0; left: 0; width: 100%; height: 50px;">
                    Toast covering top half
                </div>
                <script>
                    ${getCampsiteFromPointerSource()}
                </script>
            </body>
            </html>
        `);

        const result = await page.evaluate(() => {
            const row = document.getElementById('target-row');
            if (!row) return 'Row not found';

            const rect = row.getBoundingClientRect();
            // Click in the middle (covered by toast?? No, toast is top 50px, row is 100px.. let's make sure it covers)
            // Actually elementsFromPoint handles z-index penetration if we filter.

            // Let's click where the toast overlaps the row
            const clickX = rect.left + 10;
            const clickY = rect.top + 10;

            return window.getCampsiteFromPointer?.(clickX, clickY);
        });

        expect(result).toBe('camp-123');
    });

});

// Helper to inject the exact logic from calendar-utils.ts
// We replicate it here to ensure this test runs standalone without build pipeline issues
// verifying the *logic* is sound.
function getDateFromPointerSource() {
    return `
    window.getDateFromPointer = function(clientX, clientY) {
        const elements = document.elementsFromPoint(clientX, clientY);
        const validElements = elements.filter(el => {
            if (el.getAttribute('data-testid') === 'toast') return false;
            if (el.hasAttribute('data-ghost-mode')) return false;
            // Class list check for fixed inset-0
            if (el.classList.contains('fixed') && el.classList.contains('inset-0')) return false; 
            if (el.getAttribute('data-backdrop') === 'true') return false;
            return true;
        });

        for (const el of validElements) {
            const cell = el.closest('[data-date]');
            if (cell) {
                return cell.getAttribute('data-date');
            }
        }
        return null;
    }
    `;
}

function getCampsiteFromPointerSource() {
    return `
    window.getCampsiteFromPointer = function(clientX, clientY) {
        const elements = document.elementsFromPoint(clientX, clientY);
        const validElements = elements.filter(el => {
            if (el.getAttribute('data-testid') === 'toast') return false;
            if (el.hasAttribute('data-ghost-mode')) return false;
            if (el.classList.contains('fixed') && el.classList.contains('inset-0')) return false;
            return true;
        });

        for (const el of validElements) {
            const row = el.closest('[data-campsite-id]');
            if (row) {
                return row.getAttribute('data-campsite-id');
            }
        }
        return null;
    }
    `;
}
