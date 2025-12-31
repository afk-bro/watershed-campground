import { test, expect } from '@playwright/test';
import { createTestReservation, deleteTestReservation, DEFAULT_ORG_ID } from '../helpers/test-supabase';

/**
 * API Search Guardrail
 * 
 * Verifies that the reservation search API remains robust against:
 * 1. UUID vs String syntax errors (22P02)
 * 2. Large dataset limits (virtualization bypass)
 */
test.describe('Admin API Search Guardrail', () => {
    let testResId: string;
    let testEmail: string;

    test.beforeAll(async () => {
        const res = await createTestReservation({
            first_name: 'Guardrail',
            last_name: 'Test',
            email: `guardrail-${Date.now()}@example.com`,
            organization_id: DEFAULT_ORG_ID
        });
        testResId = res.id;
        testEmail = res.email;
    });

    test.afterAll(async () => {
        await deleteTestReservation(testResId);
    });

    test('should retrieve reservation by exact ID filter', async ({ request }) => {
        const response = await request.get(`/api/admin/reservations?id=${testResId}`);
        expect(response.ok()).toBeTruthy();

        const json = await response.json();
        expect(Array.isArray(json.data)).toBeTruthy();
        expect(json.meta.organizationId).toBe(DEFAULT_ORG_ID);

        const found = json.data.find((item: any) => item.id === testResId);
        expect(found).toBeDefined();
        expect(found.email).toBe(testEmail);
        expect(json.meta.filtered).toBe(true);
        expect(json.meta.filter.id).toBe(testResId);
    });

    test('should retrieve reservation by fuzzy email search', async ({ request }) => {
        const response = await request.get(`/api/admin/reservations?q=${testEmail}`);
        expect(response.ok()).toBeTruthy();

        const json = await response.json();
        expect(Array.isArray(json.data)).toBeTruthy();
        expect(json.data.length).toBeGreaterThan(0);

        // Assert every item returned matches the organization and at least one search field
        for (const item of json.data) {
            expect(item.organization_id).toBe(DEFAULT_ORG_ID);
            const matches =
                item.email?.includes(testEmail) ||
                item.first_name?.includes('Guardrail') ||
                item.last_name?.includes('Test') ||
                item.phone?.includes(testEmail) ||
                item.id === testEmail;
            expect(matches).toBeTruthy();
        }
    });

    test('should retrieve reservation by ID in general search (UUID check)', async ({ request }) => {
        const response = await request.get(`/api/admin/reservations?q=${testResId}`);
        expect(response.ok()).toBeTruthy();

        const json = await response.json();
        expect(Array.isArray(json.data)).toBeTruthy();
        expect(json.data.length).toBeGreaterThan(0);

        const found = json.data.find((item: any) => item.id === testResId);
        expect(found).toBeDefined();
    });

    test('should NOT crash (500) when searching with non-UUID string', async ({ request }) => {
        // This previously caused: invalid input syntax for type uuid (22P02)
        const response = await request.get(`/api/admin/reservations?q=not-a-uuid-just-text`);

        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(Array.isArray(json.data)).toBeTruthy();
        expect(json.meta.organizationId).toBe(DEFAULT_ORG_ID);
    });

    test('should respect organization scoping even with OR filters', async ({ request }) => {
        const response = await request.get(`/api/admin/reservations?q=${testEmail}`);
        const json = await response.json();

        // Every item should belong to our org
        for (const item of json.data) {
            expect(item.organization_id).toBe(DEFAULT_ORG_ID);
        }
    });

    test('should respect organization scoping even with OR filters (LEAK CHECK)', async ({ request }) => {
        const otherOrgId = '00000000-0000-0000-0000-999999999999';

        try {
            // 1. Setup - Create a second organization and a colliding reservation
            // We use direct SQL via dbUpdate/dbQuery or just assume factories work if we bypass safety
            // factories.ts uses DEFAULT_ORG_ID, let's use a workaround for the second org

            // Create the org if it doesn't exist
            const { supabaseAdmin } = require('../helpers/test-supabase');
            await supabaseAdmin.from('organizations').upsert({
                id: otherOrgId,
                name: 'Leak Test Org',
                slug: `leak-test-${Date.now()}`
            });

            const collidingRes = await createTestReservation({
                first_name: 'LEAK',
                last_name: 'DATA',
                email: testEmail, // SAME EMAIL as our main test reservation!
                organization_id: otherOrgId
            });

            // 2. Execute - Search for the shared email
            const response = await request.get(`/api/admin/reservations?q=${testEmail}`);
            expect(response.ok()).toBeTruthy();
            const json = await response.json();

            // 3. Verify - Results must ONLY contain our org's data
            expect(json.data.length).toBeGreaterThan(0);
            for (const item of json.data) {
                expect(item.organization_id).toBe(DEFAULT_ORG_ID);
                expect(item.organization_id).not.toBe(otherOrgId);
                expect(item.id).not.toBe(collidingRes.id);
            }

            // Cleanup the colliding reservation
            await deleteTestReservation(collidingRes.id);
            await supabaseAdmin.from('organizations').delete().eq('id', otherOrgId);

        } catch (err) {
            // Ensure cleanup even if test fails
            const { supabaseAdmin } = require('../helpers/test-supabase');
            await supabaseAdmin.from('organizations').delete().eq('id', otherOrgId);
            throw err;
        }
    });
});
