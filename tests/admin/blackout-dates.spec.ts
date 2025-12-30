import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { createTestBlackout } from '../helpers/factories';
import { format, addDays } from 'date-fns';

/**
 * Admin: Blackout Dates Management
 * Tests creation and management of blackout periods
 * Critical for preventing bookings during maintenance, holidays, or off-seasons
 */
test.describe('Admin Blackout Dates', () => {
    // Helper: safely parse JSON responses and produce helpful errors when HTML/other is returned
    async function parseJsonOrThrow(response: import('@playwright/test').APIResponse) {
        const headers = response.headers();
        const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
        if (!ct.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON response but got status ${response.status()} with content-type '${ct}' and body: ${text.slice(0, 500)}`);
        }
        try {
            return await response.json();
        } catch (err) {
            const text = await response.text();
            throw new Error(`Failed to parse JSON (status ${response.status()}): ${String(err)}\nBody: ${text.slice(0, 500)}`);
        }
    }
    // Tests use authenticated admin state from auth.setup.ts

    test.describe('Create Blackout Dates', () => {
        let createdBlackoutIds: string[] = [];

        test.afterEach(async () => {
            // Cleanup: delete all test blackout dates
            if (createdBlackoutIds.length > 0) {
                await supabaseAdmin
                    .from('blackout_dates')
                    .delete()
                    .in('id', createdBlackoutIds);
                createdBlackoutIds = [];
            }
        });

        test('should create campground-wide blackout period', async ({ request }) => {
            const startDate = addDays(new Date(), 60);
            const endDate = addDays(startDate, 7);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: null, // null = all sites
                    reason: 'Annual winter closure',
                    organization_id: '00000000-0000-0000-0000-000000000001',
                },
            });

            expect(response.status()).toBe(200);

            const body = await parseJsonOrThrow(response);
            expect(body.id).toBeDefined();
            expect(body.start_date).toBe(format(startDate, 'yyyy-MM-dd'));
            expect(body.end_date).toBe(format(endDate, 'yyyy-MM-dd'));
            expect(body.campsite_id).toBeNull();
            expect(body.reason).toBe('Annual winter closure');

            createdBlackoutIds.push(body.id);

            // Verify in database
            const { data } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', body.id)
                .single();

            expect(data).toBeDefined();
            expect(data?.reason).toBe('Annual winter closure');
        });

        test('should create site-specific blackout period', async ({ request }) => {
            // Get a campsite ID from seed data
            const { data: campsite } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('code', 'S1')
                .single();

            if (!campsite) {
                test.skip();
                return;
            }

            const startDate = addDays(new Date(), 70);
            const endDate = addDays(startDate, 3);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: campsite.id,
                    reason: 'Site maintenance - S1',
                    organization_id: '00000000-0000-0000-0000-000000000001',
                },
            });

            expect(response.status()).toBe(200);

            const body = await parseJsonOrThrow(response);
            expect(body.campsite_id).toBe(campsite.id);
            expect(body.reason).toContain('S1');

            createdBlackoutIds.push(body.id);
        });

        test('should create single-day blackout', async ({ request }) => {
            const blackoutDate = addDays(new Date(), 80);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(blackoutDate, 'yyyy-MM-dd'),
                    end_date: format(blackoutDate, 'yyyy-MM-dd'), // Same day
                    campsite_id: null,
                    reason: 'Holiday - New Years Day',
                    organization_id: '00000000-0000-0000-0000-000000000001',
                },
            });

            expect(response.status()).toBe(200);

            const body = await parseJsonOrThrow(response);
            expect(body.start_date).toBe(body.end_date);

            createdBlackoutIds.push(body.id);
        });

        test('should create blackout with UNASSIGNED string for all sites', async ({ request }) => {
            const startDate = addDays(new Date(), 90);
            const endDate = addDays(startDate, 5);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: 'UNASSIGNED', // Special value meaning all sites
                    reason: 'Thanksgiving week',
                    organization_id: '00000000-0000-0000-0000-000000000001',
                },
            });

            expect(response.status()).toBe(200);

            const body = await parseJsonOrThrow(response);
            expect(body.campsite_id).toBeNull(); // UNASSIGNED converted to null

            createdBlackoutIds.push(body.id);
        });

        test('should reject blackout without start date', async ({ request }) => {
            const endDate = addDays(new Date(), 100);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Invalid - no start',
                },
            });

            expect(response.status()).toBe(400);

            const body = await parseJsonOrThrow(response);
            expect(body.error).toBe('Validation failed');
            expect(body.details.start_date).toBeDefined();
            // Accept either array messages or single string message formats
            const sd = body.details.start_date;
            if (Array.isArray(sd)) {
                expect(String(sd[0]).toLowerCase()).toMatch(/required|expected/);
            } else {
                expect(String(sd).toLowerCase()).toMatch(/required|expected/);
            }
        });

        test('should reject blackout without end date', async ({ request }) => {
            const startDate = addDays(new Date(), 100);

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Invalid - no end',
                },
            });

            expect(response.status()).toBe(400);

            const body = await parseJsonOrThrow(response);
            expect(body.error).toBe('Validation failed');
            expect(body.details.end_date).toBeDefined();
            const ed = body.details.end_date;
            if (Array.isArray(ed)) {
                expect(String(ed[0]).toLowerCase()).toMatch(/required|expected/);
            } else {
                expect(String(ed).toLowerCase()).toMatch(/required|expected/);
            }
        });

        test('should reject blackout where end date is before start date', async ({ request }) => {
            const startDate = addDays(new Date(), 110);
            const endDate = addDays(startDate, -5); // 5 days before start

            const response = await request.post('/api/admin/blackout-dates', {
                data: {
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Invalid date range',
                },
            });

            // Database constraint should prevent this
            // Schema validation should prevent this (400 Bad Request)
            expect(response.status()).toBe(400);
        });
    });

    test.describe('Blackout Dates Impact on Availability', () => {
        let blackoutId: string;

        test.beforeEach(async () => {
            // Create a blackout period for availability tests
            const startDate = addDays(new Date(), 120);
            const endDate = addDays(startDate, 4);

            const blackout = await createTestBlackout({
                organization_id: '00000000-0000-0000-0000-000000000001',
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                campsite_id: null, // All sites
                reason: 'Test blackout for availability',
            });

            blackoutId = blackout.id;
        });

        test.afterEach(async () => {
            if (blackoutId) {
                await supabaseAdmin
                    .from('blackout_dates')
                    .delete()
                    .eq('id', blackoutId);
            }
        });

        test('should prevent availability during blackout period', async ({ request }) => {
            // Get blackout dates
            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', blackoutId)
                .single();

            if (!blackout) {
                test.skip();
                return;
            }

            // Try to check availability during blackout period
            const response = await request.post('/api/availability/search?org=watershed-campground', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                },
            });

            // Should return no availability or empty results
            // Parse JSON with guard; if non-JSON is returned this will throw with helpful context
            const body = await parseJsonOrThrow(response);

            if (response.status() === 200) {
                // Should return empty array
                expect(Array.isArray(body)).toBe(true);
                expect(body.length).toBe(0);
            } else {
                expect(response.status()).toBe(400);
                expect(body.error).toBeDefined();
            }
        });

        test('should allow availability before blackout period', async ({ request }) => {
            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', blackoutId)
                .single();

            if (!blackout) {
                test.skip();
                return;
            }

            // Check availability 10 days before blackout
            const checkIn = addDays(new Date(blackout.start_date), -10);
            const checkOut = addDays(checkIn, 2);

            const response = await request.post('/api/availability/search?org=watershed-campground', {
                data: {
                    checkIn: format(checkIn, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            expect(response.status()).toBe(200);

            const body = await parseJsonOrThrow(response);
            // Should have availability (unless all sites are booked for other reasons)
            // Should have availability
            expect(Array.isArray(body)).toBe(true);
            expect(body.length).toBeGreaterThan(0);
        });

        test('should allow availability after blackout period', async ({ request }) => {
            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', blackoutId)
                .single();

            if (!blackout) {
                test.skip();
                return;
            }

            // Check availability 5 days after blackout ends
            const checkIn = addDays(new Date(blackout.end_date), 5);
            const checkOut = addDays(checkIn, 2);

            const response = await request.post('/api/availability/search?org=watershed-campground', {
                data: {
                    checkIn: format(checkIn, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            expect(response.status()).toBe(200);
        });
    });

    test.describe('Site-Specific Blackout Impact', () => {
        let blackoutId: string;
        let testCampsiteId: string;

        test.beforeEach(async () => {
            // Get a test campsite
            const { data: campsite } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('code', 'S2')
                .single();

            if (!campsite) {
                test.skip();
                return;
            }

            testCampsiteId = campsite.id;

            // Create site-specific blackout
            const startDate = addDays(new Date(), 130);
            const endDate = addDays(startDate, 3);

            const { data: blackout, error } = await supabaseAdmin
                .from('blackout_dates')
                .insert({
                    organization_id: '00000000-0000-0000-0000-000000000001',
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: testCampsiteId, // Only S2
                    reason: 'S2 specific maintenance',
                })
                .select()
                .single();

            if (error || !blackout) {
                throw new Error(`Failed to setup site-specific test blackout: ${error?.message}`);
            }

            blackoutId = blackout.id;
        });

        test.afterEach(async () => {
            if (blackoutId) {
                await supabaseAdmin
                    .from('blackout_dates')
                    .delete()
                    .eq('id', blackoutId);
            }
        });

        test('should prevent booking specific site during its blackout', async ({ request }) => {
            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', blackoutId)
                .single();

            if (!blackout) {
                test.skip();
                return;
            }

            // Try to check availability specifically for the blacked-out site
            const response = await request.post('/api/availability/search?org=watershed-campground', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                    campsiteId: testCampsiteId, // Specifically request the blacked-out site
                },
            });

            // Parse response with guard to avoid silent HTML parse errors
            // The API ignores campsiteId in search, but returns ALL available sites.
            // We verify that our specific site is NOT in the list.
            const body = await parseJsonOrThrow(response);
            if (response.status() === 200) {
                expect(Array.isArray(body)).toBe(true);
                const availableIds = body.map((site: any) => site.id);
                expect(availableIds).not.toContain(testCampsiteId);
            }
        });

        test('should allow booking other sites during site-specific blackout', async ({ request }) => {
            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('id', blackoutId)
                .single();

            if (!blackout) {
                test.skip();
                return;
            }

            // Get a different campsite (not S2)
            const { data: otherSite } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('code', 'S1')
                .single();

            if (!otherSite) {
                test.skip();
                return;
            }

            // Check availability for different site during S2's blackout
            const response = await request.post('/api/availability/search?org=watershed-campground', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                    campsiteId: otherSite.id, // Different site
                },
            });

            // Other site should be available (unless it has its own blackout)
            // Other site should be available
            expect(response.status()).toBe(200);
            const body = await parseJsonOrThrow(response);
            expect(Array.isArray(body)).toBe(true);
            const availableIds = body.map((site: any) => site.id);
            // S1 should be available
            expect(availableIds).toContain(otherSite.id);
        });
    });

    test.describe('List Blackout Dates', () => {
        let testBlackoutIds: string[] = [];

        test.beforeEach(async () => {
            // Create multiple blackout dates for listing tests
            const blackouts = [
                {
                    organization_id: '00000000-0000-0000-0000-000000000001',
                    start_date: format(addDays(new Date(), 140), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 145), 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Test blackout 1',
                },
                {
                    organization_id: '00000000-0000-0000-0000-000000000001',
                    start_date: format(addDays(new Date(), 150), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 152), 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Test blackout 2',
                },
            ];

            const { data, error } = await supabaseAdmin
                .from('blackout_dates')
                .insert(blackouts)
                .select();

            if (error || !data) {
                throw new Error(`Failed to setup listing test blackouts: ${error?.message}`);
            }

            testBlackoutIds = data
                .filter((b: any): b is { id: string } => {
                    return !!b && typeof b === 'object' && 'id' in b;
                })
                .map((b) => b.id);
        });

        test.afterEach(async () => {
            if (testBlackoutIds.length > 0) {
                await supabaseAdmin
                    .from('blackout_dates')
                    .delete()
                    .in('id', testBlackoutIds);
            }
        });

        test('should fetch all blackout dates via database', async () => {
            const { data, error } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .order('start_date', { ascending: true });

            expect(error).toBeNull();
            expect(data).toBeDefined();
            expect(data!.length).toBeGreaterThanOrEqual(2);

            // Should include our test blackouts
            const testBlackouts = data!.filter((b: unknown) => {
                if (!b || typeof b !== 'object') return false;
                const id = (b as Record<string, unknown>).id;
                return typeof id === 'string' && testBlackoutIds.includes(id);
            });
            expect(testBlackouts.length).toBe(2);
        });

        test('should filter blackout dates by date range', async () => {
            const startFilter = format(addDays(new Date(), 139), 'yyyy-MM-dd');
            const endFilter = format(addDays(new Date(), 146), 'yyyy-MM-dd');

            const { data } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .gte('start_date', startFilter)
                .lte('end_date', endFilter);

            expect(data).toBeDefined();
            // Should include at least the first test blackout
            expect(data!.length).toBeGreaterThanOrEqual(1);
        });

        test('should filter blackout dates by campsite', async () => {
            // Create a site-specific blackout
            const { data: campsite } = await supabaseAdmin
                .from('campsites')
                .select('id')
                .eq('code', 'S3')
                .single();

            if (!campsite) {
                test.skip();
                return;
            }

            const { data: siteBlackout } = await supabaseAdmin
                .from('blackout_dates')
                .insert({
                    organization_id: '00000000-0000-0000-0000-000000000001',
                    start_date: format(addDays(new Date(), 160), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 162), 'yyyy-MM-dd'),
                    campsite_id: campsite.id,
                    reason: 'S3 specific test',
                })
                .select()
                .single();

            testBlackoutIds.push(siteBlackout!.id);

            // Filter by campsite
            const { data } = await supabaseAdmin
                .from('blackout_dates')
                .select('*')
                .eq('campsite_id', campsite.id);

            expect(data).toBeDefined();
            expect(data!.length).toBeGreaterThanOrEqual(1);
            expect(data![0].campsite_id).toBe(campsite.id);
        });
    });
});
