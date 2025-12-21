import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

/**
 * Admin: Blackout Dates Management
 * Tests creation and management of blackout periods
 * Critical for preventing bookings during maintenance, holidays, or off-seasons
 */
test.describe('Admin Blackout Dates', () => {
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
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
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
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
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
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
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
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
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

            const body = await response.json();
            expect(body.error).toContain('required');
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

            const body = await response.json();
            expect(body.error).toContain('required');
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
            expect(response.status()).toBe(500);
        });
    });

    test.describe('Blackout Dates Impact on Availability', () => {
        let blackoutId: string;

        test.beforeEach(async () => {
            // Create a blackout period for availability tests
            const startDate = addDays(new Date(), 120);
            const endDate = addDays(startDate, 4);

            const { data } = await supabaseAdmin
                .from('blackout_dates')
                .insert({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: null, // All sites
                    reason: 'Test blackout for availability',
                })
                .select()
                .single();

            blackoutId = data!.id;
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
            const response = await request.post('/api/availability', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                },
            });

            // Should return no availability or empty results
            const body = await response.json();

            if (response.status() === 200) {
                expect(body.available).toBe(false);
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

            const response = await request.post('/api/availability', {
                data: {
                    checkIn: format(checkIn, 'yyyy-MM-dd'),
                    checkOut: format(checkOut, 'yyyy-MM-dd'),
                    guestCount: 2,
                },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            // Should have availability (unless all sites are booked for other reasons)
            expect(body).toBeDefined();
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

            const response = await request.post('/api/availability', {
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

            const { data: blackout } = await supabaseAdmin
                .from('blackout_dates')
                .insert({
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    campsite_id: testCampsiteId, // Only S2
                    reason: 'S2 specific maintenance',
                })
                .select()
                .single();

            blackoutId = blackout!.id;
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
            const response = await request.post('/api/availability', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                    campsiteId: testCampsiteId, // Specifically request the blacked-out site
                },
            });

            // Should not be available
            const body = await response.json();
            if (response.status() === 200) {
                expect(body.available).toBe(false);
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
            const response = await request.post('/api/availability', {
                data: {
                    checkIn: blackout.start_date,
                    checkOut: blackout.end_date,
                    guestCount: 2,
                    campsiteId: otherSite.id, // Different site
                },
            });

            // Other site should be available (unless it has its own blackout)
            expect(response.status()).toBe(200);
        });
    });

    test.describe('List Blackout Dates', () => {
        let testBlackoutIds: string[] = [];

        test.beforeEach(async () => {
            // Create multiple blackout dates for listing tests
            const blackouts = [
                {
                    start_date: format(addDays(new Date(), 140), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 145), 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Test blackout 1',
                },
                {
                    start_date: format(addDays(new Date(), 150), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 152), 'yyyy-MM-dd'),
                    campsite_id: null,
                    reason: 'Test blackout 2',
                },
            ];

            const { data } = await supabaseAdmin
                .from('blackout_dates')
                .insert(blackouts)
                .select();

            testBlackoutIds = data!.map((b: any) => b.id);
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
            const testBlackouts = data!.filter((b: any) =>
                testBlackoutIds.includes(b.id)
            );
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
