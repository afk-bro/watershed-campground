import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit/audit-service";
import { verifyOrgResource } from '@/lib/db-helpers';
import { checkReservationConflicts } from "@/lib/services/conflict-checker.service";
import { errorResponse } from "@/lib/api-helpers";
import { withAdminMutation } from '@/lib/admin/with-admin-mutation';

/**
 * Assign a reservation to a campsite
 *
 * POST /api/admin/reservations/[id]/assign
 *
 * Body: { campsiteId: string }
 *
 * This endpoint:
 * 1. Validates the campsite exists and is active
 * 2. Checks for reservation and blackout conflicts
 * 3. Assigns the reservation to the campsite
 * 4. Auto-confirms pending reservations
 * 5. Logs the assignment to the admin audit trail
 */
export const POST = withAdminMutation(
    {
        action: 'reservation.assign',
        resourceType: 'reservation',
        resourceIdExtractor: (ctx) => ctx.params.id,
        metadataExtractor: (ctx, result: any) => ({
            from_campsite_id: result.oldCampsiteId,
            to_campsite_id: result.campsiteId,
            check_in: result.checkIn,
            check_out: result.checkOut,
            status_transition: result.statusTransition,
        }),
    },
    async ({ request, user, organizationId, params }) => {
        const { id } = params;
        const body = await request.json();
        const { campsiteId } = body;

        if (!campsiteId) {
            throw new Error("campsiteId is required");
        }

        // 1. Fetch Reservation Details (org-scoped)
        const { data: reservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', id)
            .eq('organization_id', organizationId)
            .single();

        if (resError || !reservation) {
            throw new Error("Reservation not found");
        }

        // 2. Validate Campsite Exists and is Active (org-scoped)
        const campsite = await verifyOrgResource<{ is_active: boolean }>('campsites', campsiteId, organizationId);

        if (!campsite) {
            throw new Error("Campsite not found");
        }
        if (!campsite.is_active) {
            throw new Error("Campsite is not active");
        }

        // 3. Check for Conflicts using conflict checker service
        const conflictCheck = await checkReservationConflicts({
            campsiteId,
            checkIn: reservation.check_in,
            checkOut: reservation.check_out,
            organizationId,
            excludeReservationId: id,
        });

        if (conflictCheck.hasConflicts) {
            if (conflictCheck.reservationConflicts.length > 0) {
                const error: any = new Error("Campsite is already booked for these dates");
                error.code = 'RESERVATION_CONFLICT';
                error.details = { conflicts: conflictCheck.reservationConflicts };
                throw error;
            }
            if (conflictCheck.blackoutConflicts.length > 0) {
                const error: any = new Error("Campsite is blacked out for these dates");
                error.code = 'BLACKOUT_CONFLICT';
                error.details = { blackouts: conflictCheck.blackoutConflicts };
                throw error;
            }
        }

        // 4. Perform Assignment (org-scoped)
        const updates: any = { campsite_id: campsiteId };

        // Auto-confirm if currently pending
        const statusTransition = reservation.status === 'pending'
            ? `pending → confirmed`
            : undefined;

        if (reservation.status === 'pending') {
            updates.status = 'confirmed';
        }

        const { error: updateError } = await supabaseAdmin
            .from('reservations')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', organizationId);

        if (updateError) {
            throw updateError;
        }

        // 5. Legacy Audit Logging (keep for backwards compatibility)
        await logAudit({
            action: 'RESERVATION_UPDATE',
            reservationId: id,
            oldData: {
                campsite_id: reservation.campsite_id,
                status: reservation.status
            },
            newData: {
                campsite_id: campsiteId,
                status: updates.status || reservation.status
            },
            changedBy: user.id,
            organizationId
        });

        // Return data for audit metadata extraction
        return {
            success: true,
            campsiteId,
            oldCampsiteId: reservation.campsite_id,
            checkIn: reservation.check_in,
            checkOut: reservation.check_out,
            statusTransition,
        };
    }
);
