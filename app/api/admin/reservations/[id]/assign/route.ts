import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { logAudit } from "@/lib/audit/audit-service";
import { verifyOrgResource } from '@/lib/db-helpers';
import { logger } from "@/lib/logger";
import { checkReservationConflicts } from "@/lib/services/conflict-checker.service";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;
        const body = await request.json();
        const { campsiteId } = body;

        if (!campsiteId) {
            return errorResponse("campsiteId is required", 400);
        }

        // 1. Fetch Reservation Details (org-scoped)
        const { data: reservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', id)
            .eq('organization_id', organizationId!)
            .single();

        if (resError || !reservation) {
            return errorResponse("Reservation not found", 404);
        }

        // 2. Validate Campsite Exists and is Active (org-scoped)
        const campsite = await verifyOrgResource<{ is_active: boolean }>('campsites', campsiteId, organizationId!);

        if (!campsite) {
            return errorResponse("Campsite not found", 404);
        }
        if (!campsite.is_active) {
            return errorResponse("Campsite is not active", 409);
        }

        // 3. Check for Conflicts using conflict checker service
        const conflictCheck = await checkReservationConflicts({
            campsiteId,
            checkIn: reservation.check_in,
            checkOut: reservation.check_out,
            organizationId: organizationId!,
            excludeReservationId: id,
        });

        if (conflictCheck.hasConflicts) {
            if (conflictCheck.reservationConflicts.length > 0) {
                return errorResponse("Campsite is already booked for these dates", 409, {
                    conflicts: conflictCheck.reservationConflicts,
                });
            }
            if (conflictCheck.blackoutConflicts.length > 0) {
                return errorResponse("Campsite is blacked out for these dates", 409, {
                    blackouts: conflictCheck.blackoutConflicts,
                });
            }
        }

        // 4. Perform Assignment (org-scoped)
        const { error: updateError } = await supabaseAdmin
            .from('reservations')
            .update({ campsite_id: campsiteId })
            .eq('id', id)
            .eq('organization_id', organizationId!);

        if (updateError) {
            throw updateError;
        }

        // 5. Audit Logging
        await logAudit({
            action: 'RESERVATION_UPDATE',
            reservationId: id,
            oldData: { campsite_id: reservation.campsite_id },
            newData: { campsite_id: campsiteId },
            changedBy: user!.id,
            organizationId: organizationId!
        });

        return successResponse({ success: true, campsiteId });

    } catch (error) {
        logger.error("Assignment Error:", error);
        return errorResponse("Internal Server Error", 500);
    }
}
