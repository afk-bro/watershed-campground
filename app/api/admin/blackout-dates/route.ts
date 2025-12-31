import { supabaseAdmin } from '@/lib/supabase-admin';
import { blackoutFormSchema } from '@/lib/schemas';
import { logBlackoutDateChange } from '@/lib/audit/audit-service';
import { verifyOrgResource } from '@/lib/db-helpers';
import { withAdminMutation } from '@/lib/admin/with-admin-mutation';
import type { ZodError } from 'zod';

/**
 * Create a new blackout date
 *
 * POST /api/admin/blackout-dates
 *
 * Body: { start_date: string, end_date: string, campsite_id?: string, reason?: string }
 *
 * This endpoint:
 * 1. Validates the input data
 * 2. Verifies campsite ownership (if specified)
 * 3. Creates the blackout date
 * 4. Logs the creation to the admin audit trail
 */
export const POST = withAdminMutation(
    {
        action: 'blackout.create',
        resourceType: 'blackout',
        resourceIdExtractor: (ctx, result: any) => result.data.id,
        metadataExtractor: (ctx, result: any) => ({
            campsite_id: result.data.campsite_id,
            start_date: result.data.start_date,
            end_date: result.data.end_date,
            reason: result.data.reason,
        }),
    },
    async ({ request, user, organizationId }) => {
        // 1. Validation
        const body = await request.json();
        const validation = blackoutFormSchema.safeParse(body);

        if (!validation.success) {
            const error: any = new Error('Validation failed');
            error.code = 'VALIDATION_ERROR';
            error.details = validation.error.flatten().fieldErrors;
            throw error;
        }

        const { start_date, end_date, campsite_id, reason } = validation.data;

        // 2. Verify Campsite Ownership (if campsite_id provided)
        const finalCampsiteId = campsite_id === 'UNASSIGNED' ? null : campsite_id;
        if (finalCampsiteId) {
            // Verify campsite belongs to this org (404 if not found)
            const campsite = await verifyOrgResource('campsites', finalCampsiteId, organizationId);
            if (!campsite) {
                throw new Error('Campsite not found or access denied');
            }
        }

        // 3. Database Operation (org-scoped)
        const { data, error } = await supabaseAdmin
            .from('blackout_dates')
            .insert({
                start_date,
                end_date,
                campsite_id: finalCampsiteId,
                reason,
                organization_id: organizationId,
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Legacy Audit Logging (keep for backwards compatibility)
        await logBlackoutDateChange({
            action: 'BLACKOUT_CREATE',
            newData: data,
            userId: user.id,
            organizationId
        });

        return { data };
    }
);
