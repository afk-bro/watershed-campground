/**
 * Reservation Service
 *
 * Business logic for managing reservation updates.
 * Handles validation, conflict checking, database updates, audit logging, and notifications.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkReservationConflicts } from "@/lib/services/conflict-checker.service";
import { sendReservationNotification, shouldSendNotification } from "@/lib/services/notification.service";
import { logAudit } from "@/lib/audit/audit-service";
import { logger } from "@/lib/logger";
import type { ReservationStatus } from "@/lib/supabase";

/**
 * Reservation update parameters
 */
export interface UpdateReservationParams {
  id: string;
  updates: {
    status?: ReservationStatus;
    campsite_id?: string | null;
    check_in?: string;
    check_out?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    notes?: string | null;
  };
  organizationId: string;
  userId: string;
}

/**
 * Reservation data returned from database
 */
interface ReservationData {
  id: string;
  status: ReservationStatus;
  campsite_id: string | null;
  check_in: string;
  check_out: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string | null;
  updated_at: string;
  campsites?: {
    id: string;
    name: string;
    code: string;
  };
}

/**
 * Result of reservation update operation
 */
export interface UpdateReservationResult {
  reservation: ReservationData;
  emailSent: boolean;
  hadConflicts: boolean;
}

/**
 * Error thrown when validation fails
 */
export class ReservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationValidationError';
  }
}

/**
 * Error thrown when conflicts are detected
 */
export class ReservationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationConflictError';
  }
}

/**
 * Fetch existing reservation with campsite details
 */
async function fetchReservation(
  id: string,
  organizationId: string
): Promise<ReservationData | null> {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*, campsites(id, name, code)')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ReservationData;
}

/**
 * Validate date ordering
 */
function validateDates(checkIn: string, checkOut: string): void {
  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new ReservationValidationError('Check-out must be after check-in');
  }
}

/**
 * Verify campsite exists and belongs to organization
 */
async function verifyCampsite(
  campsiteId: string,
  organizationId: string
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('campsites')
    .select('id')
    .eq('id', campsiteId)
    .eq('organization_id', organizationId)
    .single();

  if (!data) {
    throw new ReservationValidationError('Campsite not found');
  }
}

/**
 * Build update object from params
 */
function buildUpdateObject(updates: UpdateReservationParams['updates']): Record<string, unknown> {
  const updateObj: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  // Map camelCase to snake_case and add to update object
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.campsite_id !== undefined) updateObj.campsite_id = updates.campsite_id;
  if (updates.check_in !== undefined) updateObj.check_in = updates.check_in;
  if (updates.check_out !== undefined) updateObj.check_out = updates.check_out;
  if (updates.first_name !== undefined) updateObj.first_name = updates.first_name;
  if (updates.last_name !== undefined) updateObj.last_name = updates.last_name;
  if (updates.email !== undefined) updateObj.email = updates.email;
  if (updates.phone !== undefined) updateObj.phone = updates.phone;
  if (updates.notes !== undefined) updateObj.notes = updates.notes;

  return updateObj;
}

/**
 * Update reservation with business logic
 *
 * Handles the complete update workflow:
 * 1. Fetch current reservation
 * 2. Validate changes
 * 3. Check for conflicts
 * 4. Update database
 * 5. Log audit trail
 * 6. Send notifications
 *
 * @param params - Update parameters
 * @returns Updated reservation with operation metadata
 * @throws ReservationValidationError if validation fails
 * @throws ReservationConflictError if conflicts detected
 */
export async function updateReservation(
  params: UpdateReservationParams
): Promise<UpdateReservationResult> {
  const { id, updates, organizationId, userId } = params;

  // 1. Fetch current reservation
  const oldReservation = await fetchReservation(id, organizationId);
  if (!oldReservation) {
    throw new ReservationValidationError('Reservation not found');
  }

  // 2. Build update object
  const updateObj = buildUpdateObject(updates);

  // 3. Determine final values for validation
  const finalCheckIn = updates.check_in || oldReservation.check_in;
  const finalCheckOut = updates.check_out || oldReservation.check_out;
  const finalCampsiteId = updates.campsite_id !== undefined
    ? updates.campsite_id
    : oldReservation.campsite_id;

  // 4. Validate date ordering
  validateDates(finalCheckIn, finalCheckOut);

  // 5. Validate campsite if changed
  if (finalCampsiteId !== null && updates.campsite_id !== undefined) {
    await verifyCampsite(finalCampsiteId, organizationId);
  }

  // 6. Check for conflicts (only if campsite/dates changed)
  let hadConflicts = false;
  const needsConflictCheck =
    finalCampsiteId !== null &&
    (updates.campsite_id !== undefined ||
      updates.check_in !== undefined ||
      updates.check_out !== undefined);

  if (needsConflictCheck) {
    const conflictResult = await checkReservationConflicts({
      campsiteId: finalCampsiteId!,
      checkIn: finalCheckIn,
      checkOut: finalCheckOut,
      organizationId,
      excludeReservationId: id
    });

    if (conflictResult.hasConflicts) {
      hadConflicts = true;

      if (conflictResult.blackoutConflicts.length > 0) {
        throw new ReservationConflictError('Conflict with blackout date');
      }

      if (conflictResult.reservationConflicts.length > 0) {
        throw new ReservationConflictError('Conflicts with existing reservation');
      }
    }
  }

  // 7. Update database
  const { data: updatedReservation, error: updateError } = await supabaseAdmin
    .from('reservations')
    .update(updateObj)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select('*, campsites(id, name, code)')
    .single();

  if (updateError || !updatedReservation) {
    logger.error('Failed to update reservation:', updateError);
    throw new Error('Failed to update reservation');
  }

  // 8. Log audit trail
  await logAudit({
    action: 'RESERVATION_UPDATE',
    reservationId: id,
    oldData: oldReservation as unknown as import('@/lib/database.types').Json,
    newData: updatedReservation as unknown as import('@/lib/database.types').Json,
    changedBy: userId,
    organizationId
  });

  // 9. Send notification if needed
  let emailSent = false;
  const notificationType = shouldSendNotification(
    {
      status: oldReservation.status,
      campsite_id: oldReservation.campsite_id,
      check_in: oldReservation.check_in,
      check_out: oldReservation.check_out
    },
    {
      status: updatedReservation.status,
      campsite_id: updatedReservation.campsite_id,
      check_in: updatedReservation.check_in,
      check_out: updatedReservation.check_out
    }
  );

  if (notificationType) {
    const result = await sendReservationNotification({
      type: notificationType,
      reservation: {
        id: updatedReservation.id,
        email: updatedReservation.email,
        first_name: updatedReservation.first_name,
        last_name: updatedReservation.last_name,
        check_in: updatedReservation.check_in,
        check_out: updatedReservation.check_out,
        campsite: updatedReservation.campsites
          ? {
              name: updatedReservation.campsites.name,
              code: updatedReservation.campsites.code
            }
          : undefined
      },
      changeDetails: {
        oldCampsite: oldReservation.campsites?.name,
        newCampsite: updatedReservation.campsites?.name,
        oldCheckIn: oldReservation.check_in,
        newCheckIn: updatedReservation.check_in,
        oldCheckOut: oldReservation.check_out,
        newCheckOut: updatedReservation.check_out
      }
    });
    emailSent = result.sent;
  }

  return {
    reservation: updatedReservation as ReservationData,
    emailSent,
    hadConflicts
  };
}
