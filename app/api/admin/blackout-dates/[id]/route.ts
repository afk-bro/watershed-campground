import { supabaseAdmin } from '@/lib/supabase-admin';
import { blackoutFormSchema } from '@/lib/schemas';
import { logBlackoutDateChange } from '@/lib/audit/audit-service';
import { verifyOrgResource } from '@/lib/db-helpers';
import type { Json } from '@/lib/database.types';
import { withAdminMutation } from '@/lib/admin/with-admin-mutation';

/**
 * Update an existing blackout date
 *
 * PATCH /api/admin/blackout-dates/[id]
 *
 * This endpoint:
 * 1. Validates the input data
 * 2. Checks for conflicts with reservations and other blackouts
 * 3. Updates the blackout date
 * 4. Logs the update to the admin audit trail
 */
export const PATCH = withAdminMutation(
    {
        action: 'blackout.update',
        resourceType: 'blackout',
        resourceIdExtractor: (ctx) => ctx.params.id,
        metadataExtractor: (ctx, result: any) => ({
            campsite_id: result.data.campsite_id,
            before: {
                start_date: result.before.start_date,
                end_date: result.before.end_date,
            },
            after: {
                start_date: result.data.start_date,
                end_date: result.data.end_date,
            },
        }),
    },
    async ({ request, user, organizationId, params }) => {
        const { id } = params;

        // 1. Fetch existing blackout for comparison/logging
        const existingBlackout = await verifyOrgResource<{
            start_date: string;
            end_date: string;
            campsite_id: string | null;
            reason: string;
        }>('blackout_dates', id, organizationId);

        if (!existingBlackout) {
            throw new Error('Blackout date not found or access denied');
        }

        // 2. Validation
        const body = await request.json();
        const partialSchema = blackoutFormSchema.partial();
        const validation = partialSchema.safeParse(body);

        if (!validation.success) {
            const error: any = new Error('Validation failed');
            error.code = 'VALIDATION_ERROR';
            error.details = validation.error.flatten().fieldErrors;
            throw error;
        }

        const { start_date, end_date, campsite_id, reason } = validation.data;

        // Use existing values if not provided for conflict check
        const newStartDate = start_date || existingBlackout.start_date;
        const newEndDate = end_date || existingBlackout.end_date;
        const newCampsiteId = campsite_id !== undefined ? (campsite_id === 'UNASSIGNED' ? null : campsite_id) : existingBlackout.campsite_id;

        // Validate date order
        if (new Date(newEndDate) <= new Date(newStartDate)) {
            const error: any = new Error('End date must be after start date');
            error.code = 'INVALID_DATE_RANGE';
            throw error;
        }

        // Validate campsite if provided (verify ownership)
        if (newCampsiteId !== null) {
            const campsite = await verifyOrgResource('campsites', newCampsiteId, organizationId);
            if (!campsite) {
                throw new Error('Campsite not found or access denied');
            }
        }

        // SERVER-SIDE CONFLICT VALIDATION
        const { data: conflictingReservations } = await supabaseAdmin
            .from('reservations')
            .select('id, first_name, last_name, check_in, check_out, status, campsite_id')
            .eq('organization_id', organizationId)
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .not('status', 'in', '(cancelled,no_show)')
            .gte('check_out', newStartDate)
            .lte('check_in', newEndDate);

        const actualReservationConflicts = (conflictingReservations || []).filter(res => {
            return newStartDate < res.check_out && newEndDate > res.check_in;
        });

        if (actualReservationConflicts.length > 0) {
            const error: any = new Error('Conflict with reservation');
            error.code = 'RESERVATION_CONFLICT';
            error.details = { conflicts: actualReservationConflicts };
            throw error;
        }

        // Check for conflicts with other blackout dates (org-scoped)
        const { data: conflictingBlackouts } = await supabaseAdmin
            .from('blackout_dates')
            .select('id, start_date, end_date, reason, campsite_id')
            .eq('organization_id', organizationId)
            .neq('id', id)
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .gte('end_date', newStartDate)
            .lte('start_date', newEndDate);

        const actualBlackoutConflicts = (conflictingBlackouts || []).filter(blackout => {
            return newStartDate < blackout.end_date && newEndDate > blackout.start_date;
        });

        if (actualBlackoutConflicts.length > 0) {
            const error: any = new Error('Conflict with another blackout');
            error.code = 'BLACKOUT_CONFLICT';
            error.details = { conflicts: actualBlackoutConflicts };
            throw error;
        }

        // 3. Update
        const updates: any = {};
        if (start_date) updates.start_date = start_date;
        if (end_date) updates.end_date = end_date;
        if (campsite_id !== undefined) updates.campsite_id = campsite_id === 'UNASSIGNED' ? null : campsite_id;
        if (reason !== undefined) updates.reason = reason;
        updates.updated_at = new Date().toISOString();

        const { data: updatedBlackout, error: updateError } = await supabaseAdmin
            .from('blackout_dates')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 4. Legacy Audit Logging (keep for backwards compatibility)
        await logBlackoutDateChange({
            action: 'BLACKOUT_UPDATE',
            oldData: existingBlackout,
            newData: updatedBlackout,
            userId: user.id,
            organizationId
        });

        return {
            data: updatedBlackout,
            before: existingBlackout,
        };
    }
);

/**
 * Delete a blackout date
 *
 * DELETE /api/admin/blackout-dates/[id]
 *
 * This endpoint:
 * 1. Verifies the blackout exists
 * 2. Deletes the blackout date
 * 3. Logs the deletion to the admin audit trail
 */
export const DELETE = withAdminMutation(
    {
        action: 'blackout.delete',
        resourceType: 'blackout',
        resourceIdExtractor: (ctx) => ctx.params.id,
        metadataExtractor: (ctx, result: any) => ({
            campsite_id: result.existing.campsite_id,
            start_date: result.existing.start_date,
            end_date: result.existing.end_date,
        }),
    },
    async ({ user, organizationId, params }) => {
        const { id } = params;

        // 1. Fetch existing for logging
        const existingBlackout = await verifyOrgResource('blackout_dates', id, organizationId);

        if (!existingBlackout) {
            throw new Error('Blackout date not found or access denied');
        }

        // 2. Delete (org-scoped)
        const { error: deleteError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('id', id)
            .eq('organization_id', organizationId);

        if (deleteError) throw deleteError;

        // 3. Legacy Audit Logging (keep for backwards compatibility)
        await logBlackoutDateChange({
            action: 'BLACKOUT_DELETE',
            oldData: existingBlackout as unknown as Json,
            userId: user.id,
            organizationId
        });

        return {
            message: 'Blackout date deleted successfully',
            existing: existingBlackout,
        };
    }
);
