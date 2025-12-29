import { NextResponse } from "next/server";
import { requireAdminWithOrg } from '@/lib/admin-auth';
import { reservationUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import {
  updateReservation,
  ReservationValidationError,
  ReservationConflictError
} from "@/lib/services/reservation.service";
import { validationError, errorResponse } from "@/lib/api-helpers";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // 2. Validation
        const body = await request.json();
        const validation = reservationUpdateSchema.safeParse(body);

        if (!validation.success) {
            return validationError(validation.error);
        }

        const { status, campsite_id, check_in, check_out, firstName, lastName, email, phone, notes } = validation.data;

        // 3. Update reservation using service layer
        const result = await updateReservation({
            id,
            updates: {
                status,
                campsite_id,
                check_in,
                check_out,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                notes
            },
            organizationId: organizationId!,
            userId: user!.id
        });

        return NextResponse.json({
            reservation: result.reservation,
            emailSent: result.emailSent
        });
    } catch (error) {
        // Handle specific service errors with appropriate status codes
        if (error instanceof ReservationValidationError) {
            return errorResponse(error.message, 400);
        }

        if (error instanceof ReservationConflictError) {
            return errorResponse(error.message, 409);
        }

        logger.error("Error in PATCH /api/admin/reservations/[id]:", error);
        return errorResponse("Internal server error", 500);
    }
}
