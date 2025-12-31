/**
 * Conflict Checker Service
 *
 * Centralized service for checking reservation and blackout date conflicts.
 * Prevents double-booking and scheduling conflicts across the system.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Parameters for conflict checking
 */
export interface ConflictCheckParams {
  campsiteId: string;
  checkIn: string;
  checkOut: string;
  organizationId: string;
  excludeReservationId?: string;
}

/**
 * Result of conflict check
 */
export interface ConflictCheckResult {
  hasConflicts: boolean;
  reservationConflicts: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  blackoutConflicts: Array<{
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
  }>;
}

/**
 * Check for reservation and blackout conflicts
 *
 * This function checks if a campsite is available for the given date range,
 * considering both existing reservations and blackout dates.
 *
 * @param params - Conflict check parameters
 * @returns Conflict check result with details
 */
export async function checkReservationConflicts(
  params: ConflictCheckParams
): Promise<ConflictCheckResult> {
  const {
    campsiteId,
    checkIn,
    checkOut,
    organizationId,
    excludeReservationId,
  } = params;

  const result: ConflictCheckResult = {
    hasConflicts: false,
    reservationConflicts: [],
    blackoutConflicts: [],
  };

  // Check for blackout date conflicts
  // Query for blackouts that overlap with the requested date range
  // Overlap condition: blackout_start < check_out AND blackout_end >= check_in
  const { data: blackoutData } = await supabaseAdmin
    .from("blackout_dates")
    .select("id, start_date, end_date, reason")
    .eq("organization_id", organizationId)
    .or(`campsite_id.is.null,campsite_id.eq.${campsiteId}`)
    .lt("start_date", checkOut)
    .gte("end_date", checkIn);

  if (blackoutData && blackoutData.length > 0) {
    result.hasConflicts = true;
    result.blackoutConflicts = blackoutData;
  }

  // Check for reservation conflicts
  // Query for reservations that overlap with the requested date range
  // Overlap condition: reservation_check_in < check_out AND reservation_check_out > check_in
  let reservationQuery = supabaseAdmin
    .from("reservations")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("campsite_id", campsiteId)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .not("status", "in", "(cancelled,no_show)");

  // Exclude a specific reservation if provided (for update scenarios)
  if (excludeReservationId) {
    reservationQuery = reservationQuery.neq("id", excludeReservationId);
  }

  const { data: reservationData } = await reservationQuery;

  if (reservationData && reservationData.length > 0) {
    result.hasConflicts = true;
    result.reservationConflicts = reservationData;
  }

  return result;
}
