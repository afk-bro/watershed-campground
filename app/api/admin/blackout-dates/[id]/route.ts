import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { BlackoutDate, Reservation } from '@/lib/supabase';

type UpdateBlackoutBody = {
    start_date?: string;
    end_date?: string;
    campsite_id?: string | null;
    reason?: string;
};

/**
 * PATCH /api/admin/blackout-dates/[id]
 * Update an existing blackout date with server-side validation
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { start_date, end_date, campsite_id, reason } = body as UpdateBlackoutBody;

        // Fetch existing blackout
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

        // Build updates object
        const updates: Partial<UpdateBlackoutBody & { updated_at: string }> = {};

        // Use existing values if not provided
        const newStartDate = start_date || existingBlackout.start_date;
        const newEndDate = end_date || existingBlackout.end_date;
        const newCampsiteId = campsite_id !== undefined ? campsite_id : existingBlackout.campsite_id;

        // Validate dates
        if (new Date(newEndDate) <= new Date(newStartDate)) {
            return NextResponse.json(
                { error: 'End date must be after start date (minimum 1 night)' },
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
                return NextResponse.json(
                    { error: 'Campsite not found' },
                    { status: 404 }
                );
            }

            if (!campsite.is_active) {
                return NextResponse.json(
                    { error: 'Cannot assign blackout to inactive campsite' },
                    { status: 400 }
                );
            }
        }

        // SERVER-SIDE CONFLICT VALIDATION
        // Check for conflicts with existing reservations
        const { data: conflictingReservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('id, first_name, last_name, check_in, check_out, status, campsite_id')
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .not('status', 'in', '(cancelled,no_show)')
            .gte('check_out', newStartDate)
            .lte('check_in', newEndDate);

        if (resError) {
            console.error('Error checking reservation conflicts:', resError);
            return NextResponse.json(
                { error: 'Failed to validate conflicts' },
                { status: 500 }
            );
        }

        // Filter to actual overlaps (Supabase query might return false positives)
        const actualReservationConflicts = (conflictingReservations || []).filter(res => {
            // Check overlap: start_a < end_b AND end_a > start_b
            return newStartDate < res.check_out && newEndDate > res.check_in;
        });

        if (actualReservationConflicts.length > 0) {
            const conflict = actualReservationConflicts[0];
            return NextResponse.json(
                {
                    error: `Conflicts with reservation for ${conflict.first_name} ${conflict.last_name}`,
                    code: 'CONFLICT_RESERVATION',
                    conflicts: actualReservationConflicts
                },
                { status: 409 }
            );
        }

        // Check for conflicts with other blackout dates
        const { data: conflictingBlackouts, error: blackoutError } = await supabaseAdmin
            .from('blackout_dates')
            .select('id, start_date, end_date, reason, campsite_id')
            .neq('id', id) // Exclude current blackout
            .or(`campsite_id.eq.${newCampsiteId}${newCampsiteId === null ? ',campsite_id.is.null' : ''}`)
            .gte('end_date', newStartDate)
            .lte('start_date', newEndDate);

        if (blackoutError) {
            console.error('Error checking blackout conflicts:', blackoutError);
            return NextResponse.json(
                { error: 'Failed to validate conflicts' },
                { status: 500 }
            );
        }

        // Filter to actual overlaps
        const actualBlackoutConflicts = (conflictingBlackouts || []).filter(blackout => {
            return newStartDate < blackout.end_date && newEndDate > blackout.start_date;
        });

        if (actualBlackoutConflicts.length > 0) {
            const conflict = actualBlackoutConflicts[0];
            return NextResponse.json(
                {
                    error: `Conflicts with existing blackout: ${conflict.reason || 'Unavailable'}`,
                    code: 'CONFLICT_BLACKOUT',
                    conflicts: actualBlackoutConflicts
                },
                { status: 409 }
            );
        }

        // Build final updates object
        if (start_date) updates.start_date = start_date;
        if (end_date) updates.end_date = end_date;
        if (campsite_id !== undefined) updates.campsite_id = campsite_id;
        if (reason !== undefined) updates.reason = reason;

        // Perform update
        const { data: updatedBlackout, error: updateError } = await supabaseAdmin
            .from('blackout_dates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating blackout date:', updateError);
            return NextResponse.json(
                { error: 'Failed to update blackout date' },
                { status: 500 }
            );
        }

        return NextResponse.json(updatedBlackout);
    } catch (error) {
        console.error('Error in PATCH /api/admin/blackout-dates/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
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
        const { id } = await params;

        // Check if blackout exists
        const { data: existingBlackout, error: fetchError } = await supabaseAdmin
            .from('blackout_dates')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError || !existingBlackout) {
            return NextResponse.json(
                { error: 'Blackout date not found' },
                { status: 404 }
            );
        }

        // Delete the blackout
        const { error: deleteError } = await supabaseAdmin
            .from('blackout_dates')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting blackout date:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete blackout date' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Blackout date deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in DELETE /api/admin/blackout-dates/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
