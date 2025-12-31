
import { test, expect } from '@playwright/test';
import { supabaseAdmin, createTestCampsite, deleteTestCampsite, createTestBlackout, DEFAULT_ORG_ID } from '../helpers/test-supabase';
import { format, addDays } from 'date-fns';

test.describe('Blackout API Operations', () => {
    let testCampsiteId: string;
    let alternateCampsiteId: string;

    test.beforeAll(async () => {
        const campsite1 = await createTestCampsite({ name: 'API Test Source' });
        const campsite2 = await createTestCampsite({ name: 'API Test Target' });

        testCampsiteId = campsite1.id;
        alternateCampsiteId = campsite2.id;
    });

    test.afterAll(async () => {
        if (testCampsiteId) await deleteTestCampsite(testCampsiteId);
        if (alternateCampsiteId) await deleteTestCampsite(alternateCampsiteId);
    });

    test('should move blackout validation via API', async ({ request }) => {
        // Setup: Create a blackout using factory
        const startDate = addDays(new Date(), 5);
        const endDate = addDays(startDate, 3);

        const blackout = await createTestBlackout({
            campsite_id: testCampsiteId,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            reason: 'API Move Test'
        });

        const blackoutId = blackout.id;

        // 1. Move to different campsite
        const { data: update1, error: error1 } = await supabaseAdmin
            .from('blackout_dates')
            .update({ campsite_id: alternateCampsiteId })
            .eq('id', blackoutId)
            .select()
            .single();

        expect(error1).toBeNull();
        expect(update1?.campsite_id).toBe(alternateCampsiteId);

        // 2. Move dates on same campsite (Update via API endpoint to test validation logic/triggers)
        const newStartDate = addDays(startDate, 10);
        const newEndDate = addDays(newStartDate, 3);

        const response = await request.patch(`/api/admin/blackout-dates/${blackoutId}`, {
            data: {
                campsite_id: alternateCampsiteId, // Stay on alternate
                start_date: format(newStartDate, 'yyyy-MM-dd'),
                end_date: format(newEndDate, 'yyyy-MM-dd')
            }
        });

        expect(response.ok()).toBeTruthy();

        // Verify DB
        const { data: update2 } = await supabaseAdmin
            .from('blackout_dates')
            .select()
            .eq('id', blackoutId)
            .throwOnError()
            .single();

        expect(update2?.start_date).toBe(format(newStartDate, 'yyyy-MM-dd'));
    });

    test('should resize blackout via API', async ({ request }) => {
        const startDate = addDays(new Date(), 20);
        const endDate = addDays(startDate, 3);

        const blackout = await createTestBlackout({
            campsite_id: testCampsiteId,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            reason: 'API Resize Test'
        });

        const blackoutId = blackout.id;

        // Extend end date by 2 days
        const newEndDate = addDays(endDate, 2);

        const response = await request.patch(`/api/admin/blackout-dates/${blackoutId}`, {
            data: {
                campsite_id: testCampsiteId,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(newEndDate, 'yyyy-MM-dd')
            }
        });

        expect(response.status()).toBe(200);

        const { data: update } = await supabaseAdmin
            .from('blackout_dates')
            .select()
            .eq('id', blackoutId)
            .throwOnError()
            .single();

        expect(update?.end_date).toBe(format(newEndDate, 'yyyy-MM-dd'));
    });
});
