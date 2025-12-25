import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { blackoutFormSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/audit-service';

/**
 * PATCH /api/admin/blackout-dates/[id]
 * Update an existing blackout date with server-side validation
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // 2. Fetch existing blackout for comparison/logging
        const { data: existingBlackout, error: fetchError } = await supabaseAdmin
            .from('blackout_dates')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingBlackout) {
            return NextResponse.json(
                { error: 'Blackout date not found' },
                { status: 404 }
            );
        }

        // 3. Validation
        const body = await request.json();
        const partialSchema = blackoutFormSchema.partial();
        const validation = partialSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { start_date, end_date, campsite_id, reason } = validation.data;

        // Use existing values if not provided for conflict check
        const newStartDate = start_date || existingBlackout.start_date;
        const newEndDate = end_date || existingBlackout.end_date;
        const newCampsiteId = campsite_id !== undefined ? (campsite_id === 'UNASSIGNED' ? null : campsite_id) : existingBlackout.campsite_id;

        // Validate date order
        if (new Date(newEndDate) <= new Date(newStartDate)) {
            return NextResponse.json(
                { error: 'End date must be after start date' },
                { status: 400 }
            );
        }

        // Validate campsite if provided
        if (newCampsiteId !== null) {
            const { data: campsite, error: campsiteError } = await supabaseAdmin
                .from('campsites')
                .select('id, name, is_active')
                .eq('id', newCampsiteId)
                .single();

            if (campsiteError || !campsite) {
                return NextResponse.json({ error: 'Campsite not found' }, { status: 404 });
            }
        }

        // SERVER-SIDE CONFLICT VALIDATION (Omitted for brevity in this snippet but should be preserved or slightly refactored)
        // I will preserve the existing conflict logic here...

        // [CONFLICT LOGIC PRESERVED FROM ORIGINAL FILE]
        const { data: conflictingReservations } = await supabaseAdmin
            .from('reservations')
            .select('id, first_name, last_name, check_in, check_out, status, campsite_id')
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .not('status', 'in', '(cancelled,no_show)')
            .gte('check_out', newStartDate)
            .lte('check_in', newEndDate);

        const actualReservationConflicts = (conflictingReservations || []).filter(res => {
            return newStartDate < res.check_out && newEndDate > res.check_in;
        });

        if (actualReservationConflicts.length > 0) {
            return NextResponse.json({ error: 'Conflict with reservation', conflicts: actualReservationConflicts }, { status: 409 });
        }

        // Check for conflicts with other blackout dates
        const { data: conflictingBlackouts } = await supabaseAdmin
            .from('blackout_dates')
            .select('id, start_date, end_date, reason, campsite_id')
            .neq('id', id)
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .gte('end_date', newStartDate)
            .lte('start_date', newEndDate);

        const actualBlackoutConflicts = (conflictingBlackouts || []).filter(blackout => {
            return newStartDate < blackout.end_date && newEndDate > blackout.start_date;
        });

        if (actualBlackoutConflicts.length > 0) {
            return NextResponse.json({ error: 'Conflict with another blackout', conflicts: actualBlackoutConflicts }, { status: 409 });
        }

        // 4. Update
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
            .select()
            .single();

        if (updateError) throw updateError;

        // 5. Audit Logging
        await logAudit({
            action: 'BLACKOUT_UPDATE',
            oldData: existingBlackout,
            newData: updatedBlackout,
            changedBy: user!.id
        });

        return NextResponse.json(updatedBlackout);
    } catch (error) {
        console.error('Error in PATCH /api/admin/blackout-dates/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/blackout-dates/[id]
 * Delete a blackout date
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // 2. Fetch existing for logging
        const { data: existingBlackout, error: fetchError } = await supabaseAdmin
            .from('blackout_dates')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingBlackout) {
            return NextResponse.json({ error: 'Blackout date not found' }, { status: 404 });
        }

        // 3. Delete
        const { error: deleteError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // 4. Audit Logging
        await logAudit({
            action: 'BLACKOUT_DELETE',
            oldData: existingBlackout,
            changedBy: user!.id
        });

        return NextResponse.json({ message: 'Blackout date deleted successfully' });
    } catch (error) {
        console.error('Error in DELETE /api/admin/blackout-dates/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
