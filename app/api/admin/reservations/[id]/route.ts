import { reservationUpdateSchema } from "@/lib/schemas";
import {
  updateReservation,
  ReservationValidationError,
  ReservationConflictError
} from "@/lib/services/reservation.service";
import { withAdminMutation } from '@/lib/admin/with-admin-mutation';

/**
 * Update a reservation
 *
 * PATCH /api/admin/reservations/[id]
 *
 * This endpoint:
 * 1. Validates the update request
 * 2. Checks for conflicts (if campsite/dates changed)
 * 3. Updates the reservation
 * 4. Sends email notifications (if status/campsite/dates changed)
 * 5. Logs the update to the admin audit trail
 */
export const PATCH = withAdminMutation(
    {
        action: 'reservation.update',
        resourceType: 'reservation',
        resourceIdExtractor: (ctx) => ctx.params.id,
        metadataExtractor: (ctx, result: any) => {
            const { reservation } = result;
            const metadata: Record<string, unknown> = {
                campsite_id: reservation.campsite_id,
                status: reservation.status,
                check_in: reservation.check_in,
                check_out: reservation.check_out,
            };

            // Add email notification status
            if (result.emailSent) {
                metadata.email_sent = true;
            }

            return metadata;
        },
    },
    async ({ request, user, organizationId, params }) => {
        const { id } = params;

        // 1. Validation
        const body = await request.json();
        const validation = reservationUpdateSchema.safeParse(body);

        if (!validation.success) {
            const error: any = new Error('Validation failed');
            error.code = 'VALIDATION_ERROR';
            error.details = validation.error.flatten().fieldErrors;
            throw error;
        }

        const { status, campsite_id, check_in, check_out, firstName, lastName, email, phone, notes } = validation.data;

        // 2. Update reservation using service layer
        // Service handles: conflict checking, database update, legacy audit logging, and notifications
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

            return result;
        } catch (error) {
            // Re-throw with appropriate error codes
            if (error instanceof ReservationValidationError) {
                const err: any = new Error(error.message);
                err.code = 'VALIDATION_ERROR';
                throw err;
            }

            if (error instanceof ReservationConflictError) {
                const err: any = new Error(error.message);
                err.code = 'CONFLICT_ERROR';
                throw err;
            }

            // Re-throw other errors
            throw error;
        }
    }
);
