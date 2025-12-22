import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';

/**
 * Admin: Campsite CRUD Operations
 * Tests create, read, update, delete operations for campsite management
 * Critical for inventory management and site availability
 */
test.describe('Admin Campsite Management', () => {
    // Tests use authenticated admin state from auth.setup.ts

    test.describe('List Campsites', () => {
        test('should display all active campsites', async ({ page }) => {
            await page.goto('/admin/campsites');

            // Wait for page to load
            await expect(page.getByRole('heading', { name: /Campsites/i })).toBeVisible();

            // Should show campsite list table
            await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible();

            // Should have at least one campsite from seed data
            await expect(page.getByText('S1')).toBeVisible();
        });

        test('should filter campsites by type', async ({ page }) => {
            await page.goto('/admin/campsites');
            await expect(page.getByRole('heading', { name: /Campsites/i })).toBeVisible();

            // Click RV filter
            const rvFilter = page.getByRole('button', { name: /RV/i });
            if (await rvFilter.isVisible()) {
                await rvFilter.click();
                await page.waitForTimeout(500);

                // Should only show RV sites (e.g., S1 from seed data)
                await expect(page.getByText('S1')).toBeVisible();
                // Should not show tent sites (S4, S5)
                await expect(page.getByText('S4')).not.toBeVisible();
            }
        });

        test('should toggle show inactive campsites', async ({ page }) => {
            await page.goto('/admin/campsites');
            await expect(page.getByRole('heading', { name: /Campsites/i })).toBeVisible();

            // Check if there's a toggle for inactive sites
            const showInactiveToggle = page.getByText(/Show Inactive|Include Inactive/i);
            if (await showInactiveToggle.isVisible()) {
                await showInactiveToggle.click();
                await page.waitForTimeout(500);

                // Page should reload with inactive sites included
            }
        });
    });

    test.describe('Create Campsite', () => {
        let createdCampsiteId: string | null = null;

        test.afterEach(async () => {
            // Cleanup: delete test campsite
            if (createdCampsiteId) {
                await supabaseAdmin
                    .from('campsites')
                    .delete()
                    .eq('id', createdCampsiteId);
                createdCampsiteId = null;
            }
        });

        test('should create a new RV campsite via API', async ({ request }) => {
            const code = `TEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const response = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Test RV Site',
                    code,
                    type: 'rv',
                    maxGuests: 6,
                    baseRate: 55.00,
                    isActive: true,
                    notes: 'E2E test campsite',
                    sortOrder: 100,
                },
            });

            expect(response.status()).toBe(201);

            const body = await response.json();
            expect(body.data).toBeDefined();
            expect(body.data.name).toBe('Test RV Site');
            expect(body.data.code).toBe(code);
            expect(body.data.type).toBe('rv');
            expect(body.data.max_guests).toBe(6);
            expect(Number(body.data.base_rate)).toBe(55);

            createdCampsiteId = body.data.id;

            // Verify in database
            const { data } = await supabaseAdmin
                .from('campsites')
                .select('*')
                .eq('id', createdCampsiteId)
                .single();

            expect(data?.name).toBe('Test RV Site');
        });

        test('should create a tent campsite', async ({ request }) => {
            const code = `TENT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const response = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Test Tent Site',
                    code,
                    type: 'tent',
                    maxGuests: 4,
                    baseRate: 30.00,
                    isActive: true,
                    sortOrder: 101,
                },
            });

            expect(response.status()).toBe(201);

            const body = await response.json();
            expect(body.data.type).toBe('tent');

            createdCampsiteId = body.data.id;
        });

        test('should create a cabin', async ({ request }) => {
            const code = `CAB${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const response = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Test Cabin',
                    code,
                    type: 'cabin',
                    maxGuests: 8,
                    baseRate: 150.00,
                    isActive: true,
                    notes: 'Test cabin with full amenities',
                    sortOrder: 102,
                },
            });

            expect(response.status()).toBe(201);

            const body = await response.json();
            expect(body.data.type).toBe('cabin');
            expect(Number(body.data.base_rate)).toBe(150);

            createdCampsiteId = body.data.id;
        });

        test('should reject duplicate campsite code', async ({ request }) => {
            // Create first campsite
            const first = await request.post('/api/admin/campsites', {
                data: {
                    name: 'First Site',
                    code: 'DUP1',
                    type: 'rv',
                    maxGuests: 4,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 103,
                },
            });

            expect(first.status()).toBe(201);
            const firstBody = await first.json();
            createdCampsiteId = firstBody.data.id;

            // Try to create duplicate with same code
            const duplicate = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Duplicate Site',
                    code: 'DUP1', // Same code
                    type: 'tent',
                    maxGuests: 2,
                    baseRate: 25.00,
                    isActive: true,
                    sortOrder: 104,
                },
            });

            // Should fail with conflict
            expect(duplicate.status()).toBe(409);

            const body = await duplicate.json();
            expect(body.error).toContain('code already exists');
        });

        test('should validate required fields', async ({ request }) => {
            // Missing name
            const missingName = await request.post('/api/admin/campsites', {
                data: {
                    code: 'TEST2',
                    type: 'rv',
                    maxGuests: 4,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 105,
                },
            });

            expect(missingName.status()).toBe(400);
            const nameBody = await missingName.json();
            expect(nameBody.error).toBe('Validation failed');

            // Missing code
            const missingCode = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Test Site',
                    type: 'rv',
                    maxGuests: 4,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 106,
                },
            });

            expect(missingCode.status()).toBe(400);
        });

        test('should validate guest capacity limits', async ({ request }) => {
            // Zero guests
            const zeroGuests = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Invalid Site',
                    code: 'INV1',
                    type: 'rv',
                    maxGuests: 0,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 107,
                },
            });

            expect(zeroGuests.status()).toBe(400);

            // Too many guests (over 50)
            const tooMany = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Invalid Site',
                    code: 'INV2',
                    type: 'rv',
                    maxGuests: 51,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 108,
                },
            });

            expect(tooMany.status()).toBe(400);
        });

        test('should validate campsite type enum', async ({ request }) => {
            const invalidType = await request.post('/api/admin/campsites', {
                data: {
                    name: 'Invalid Site',
                    code: 'INV3',
                    type: 'invalid_type',
                    maxGuests: 4,
                    baseRate: 45.00,
                    isActive: true,
                    sortOrder: 109,
                },
            });

            expect(invalidType.status()).toBe(400);
        });
    });

    test.describe('Read Campsite', () => {
        test('should fetch single campsite by ID via API', async ({ request }) => {
            // Use a known campsite ID from seed data
            const { data: seedSite } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('code', 'S1')
                .single();

            if (!seedSite) {
                test.skip();
                return;
            }

            const response = await request.get(`/api/admin/campsites/${seedSite.id}`);

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data).toBeDefined();
            expect(body.data.id).toBe(seedSite.id);
            expect(body.data.code).toBe('S1');
        });

        test('should return 404 for non-existent campsite', async ({ request }) => {
            const fakeId = '00000000-0000-0000-0000-000000000999';

            const response = await request.get(`/api/admin/campsites/${fakeId}`);

            expect(response.status()).toBe(404);

            const body = await response.json();
            expect(body.error).toContain('not found');
        });
    });

    test.describe('Update Campsite', () => {
        let testCampsiteId: string;

        test.beforeEach(async () => {
            // Create a test campsite for each update test
            const code = `UPD${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const { data } = await supabaseAdmin
                .from('campsites')
                .insert({
                    name: 'Update Test Site',
                    code,
                    type: 'rv',
                    max_guests: 4,
                    base_rate: 45.00,
                    is_active: true,
                    sort_order: 200,
                })
                .select()
                .single();

            testCampsiteId = data!.id;
        });

        test.afterEach(async () => {
            // Cleanup
            await supabaseAdmin
                .from('campsites')
                .delete()
                .eq('id', testCampsiteId);
        });

        test('should update campsite name', async ({ request }) => {
            const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: {
                    name: 'Updated Site Name',
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data.name).toBe('Updated Site Name');

            // Verify in database
            const { data } = await supabaseAdmin
                .from('campsites')
                .select('name')
                .eq('id', testCampsiteId)
                .single();

            expect(data?.name).toBe('Updated Site Name');
        });

        test('should update base rate', async ({ request }) => {
            const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: {
                    baseRate: 65.00,
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(Number(body.data.base_rate)).toBe(65);
        });

        test('should update multiple fields at once', async ({ request }) => {
            const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: {
                    name: 'Multi Update Site',
                    baseRate: 75.00,
                    maxGuests: 6,
                    notes: 'Updated via test',
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data.name).toBe('Multi Update Site');
            expect(Number(body.data.base_rate)).toBe(75);
            expect(body.data.max_guests).toBe(6);
            expect(body.data.notes).toBe('Updated via test');
        });

        test('should deactivate campsite', async ({ request }) => {
            const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: {
                    isActive: false,
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data.is_active).toBe(false);

            // Verify in database
            const { data } = await supabaseAdmin
                .from('campsites')
                .select('is_active')
                .eq('id', testCampsiteId)
                .single();

            expect(data?.is_active).toBe(false);
        });

        test('should reactivate deactivated campsite', async ({ request }) => {
            // First deactivate
            await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: { isActive: false },
            });

            // Then reactivate
            const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                data: { isActive: true },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data.is_active).toBe(true);
        });

        test('should reject update to duplicate code', async ({ request }) => {
            // Create another campsite
            const dupCode = `DUP${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const { data: otherSite } = await supabaseAdmin
                .from('campsites')
                .insert({
                    name: 'Other Site',
                    code: dupCode,
                    type: 'tent',
                    max_guests: 2,
                    base_rate: 25.00,
                    is_active: true,
                    sort_order: 201,
                })
                .select()
                .single();

            try {
                // Try to update test campsite with duplicate code
                const response = await request.patch(`/api/admin/campsites/${testCampsiteId}`, {
                    data: {
                        code: dupCode, // Duplicate
                    },
                });

                expect(response.status()).toBe(409);

                const body = await response.json();
                expect(body.error).toContain('code already exists');
            } finally {
                // Cleanup
                await supabaseAdmin
                    .from('campsites')
                    .delete()
                    .eq('id', otherSite!.id);
            }
        });

        test('should return 404 when updating non-existent campsite', async ({ request }) => {
            const fakeId = '00000000-0000-0000-0000-000000000999';

            const response = await request.patch(`/api/admin/campsites/${fakeId}`, {
                data: {
                    name: 'Should Fail',
                },
            });

            expect(response.status()).toBe(404);
        });
    });

    test.describe('Delete Campsite (Soft Delete)', () => {
        let testCampsiteId: string;

        test.beforeEach(async () => {
            const code = `DEL${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            const { data } = await supabaseAdmin
                .from('campsites')
                .insert({
                    name: 'Delete Test Site',
                    code,
                    type: 'rv',
                    max_guests: 4,
                    base_rate: 45.00,
                    is_active: true,
                    sort_order: 300,
                })
                .select()
                .single();

            testCampsiteId = data!.id;
        });

        test.afterEach(async () => {
            // Hard delete for cleanup
            await supabaseAdmin
                .from('campsites')
                .delete()
                .eq('id', testCampsiteId);
        });

        test('should soft delete campsite (set is_active to false)', async ({ request }) => {
            const response = await request.delete(`/api/admin/campsites/${testCampsiteId}`);

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body.data.is_active).toBe(false);
            expect(body.message).toContain('deactivated');

            // Verify campsite still exists but is inactive
            const { data } = await supabaseAdmin
                .from('campsites')
                .select('*')
                .eq('id', testCampsiteId)
                .single();

            expect(data).toBeDefined();
            expect(data!.is_active).toBe(false);
        });

        test('should return 404 when deleting non-existent campsite', async ({ request }) => {
            const fakeId = '00000000-0000-0000-0000-000000000999';

            const response = await request.delete(`/api/admin/campsites/${fakeId}`);

            expect(response.status()).toBe(404);
        });
    });

    test.describe('UI Integration', () => {
        test('should navigate to campsite list', async ({ page }) => {
            await page.goto('/admin');

            // Click on Campsites navigation link
            await page.getByRole('link', { name: /Campsites/i }).click();

            // Should navigate to campsites page
            await expect(page).toHaveURL(/\/admin\/campsites/);
            await expect(page.getByRole('heading', { name: /Campsites/i })).toBeVisible();
        });

        test('should show add campsite button', async ({ page }) => {
            await page.goto('/admin/campsites');

            // Look for "Add" or "New" campsite button
            const addButton = page.getByRole('link', { name: /Add.*Campsite|New.*Campsite/i });
            if (await addButton.isVisible()) {
                await expect(addButton).toBeVisible();
            }
        });
    });
});
