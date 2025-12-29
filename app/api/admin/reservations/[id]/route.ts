import { NextResponse } from "next/server";
import { reservationUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import {
  updateReservation,
  ReservationValidationError,
  ReservationConflictError
} from "@/lib/services/reservation.service";
import { validationError, errorResponse } from "@/lib/api-helpers";
import { withAdminAuth } from '@/lib/admin/api-wrapper';

export const PATCH = withAdminAuth(async ({ request, user, organizationId, params }) => {
    const { id } = params;

    // 1. Validation
    const body = await request.json();
    const validation = reservationUpdateSchema.safeParse(body);

    if (!validation.success) {
        return validationError(validation.error);
    }

    const { status, campsite_id, check_in, check_out, firstName, lastName, email, phone, notes } = validation.data;

    // 2. Update reservation using service layer
    try {
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
            organizationId,
            userId: user.id
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
});
