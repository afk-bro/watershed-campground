import { format, parseISO, subDays, addDays } from 'date-fns';
import type { CalendarBlock } from './calendar-types';
import type { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';

// Type for items that can be validated
type ValidatableItem = Reservation | BlackoutDate;

// Type guards
function isReservation(item: ValidatableItem): item is Reservation {
  return 'check_in' in item && 'check_out' in item;
}

// ============================================================================
// Date Range Overlap Detection
// ============================================================================

/**
 * Check if two date ranges overlap.
 * Uses exclusive end dates: [start, end)
 *
 * Overlap occurs when: rangeA.start < rangeB.end AND rangeA.end > rangeB.start
 *
 * @param startA - Start date of range A (yyyy-MM-dd)
 * @param endA - End date of range A (yyyy-MM-dd, exclusive)
 * @param startB - Start date of range B (yyyy-MM-dd)
 * @param endB - End date of range B (yyyy-MM-dd, exclusive)
 * @returns true if ranges overlap, false otherwise
 */
export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Check if two calendar blocks overlap.
 * Blocks overlap if they're on the same resource and their date ranges intersect.
 *
 * @param blockA - First block
 * @param blockB - Second block
 * @returns true if blocks overlap, false otherwise
 */
export function blocksOverlap(blockA: CalendarBlock, blockB: CalendarBlock): boolean {
  // Blocks on different resources can't overlap
  if (blockA.resourceId !== blockB.resourceId) return false;

  // Check date range overlap
  return datesOverlap(blockA.startDate, blockA.endDate, blockB.startDate, blockB.endDate);
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Find all reservations that conflict with a candidate reservation.
 * Excludes the candidate's own ID (for move/resize operations).
 * Excludes cancelled and no-show reservations.
 *
 * @param candidateId - ID of candidate reservation (to exclude from conflicts)
 * @param targetCampsiteId - Campsite ID being checked
 * @param targetCheckIn - Proposed check-in date (yyyy-MM-dd)
 * @param targetCheckOut - Proposed check-out date (yyyy-MM-dd, exclusive)
 * @param reservations - All reservations to check against
 * @returns Array of conflicting reservations
 */
export function getConflicts(
  candidateId: string,
  targetCampsiteId: string,
  targetCheckIn: string,
  targetCheckOut: string,
  reservations: Reservation[]
): Reservation[] {
  return reservations.filter(r => {
    // Exclude current reservation
    if (r.id === candidateId) return false;

    // Only check reservations on the same campsite
    if (r.campsite_id !== targetCampsiteId) return false;

    // Exclude cancelled/no-show reservations
    if (r.status === 'cancelled' || r.status === 'no_show') return false;

    // Check overlap
    return datesOverlap(targetCheckIn, targetCheckOut, r.check_in, r.check_out);
  });
}

/**
 * Find all blackout dates that conflict with a candidate item.
 * Excludes the candidate's own ID (for move/resize operations).
 *
 * @param candidateId - ID of candidate item (to exclude from conflicts)
 * @param targetCampsiteId - Campsite ID being checked
 * @param targetStartDate - Proposed start date (yyyy-MM-dd)
 * @param targetEndDate - Proposed end date (yyyy-MM-dd, exclusive)
 * @param blackoutDates - All blackout dates to check against
 * @returns Array of conflicting blackout dates
 */
export function getBlackoutConflicts(
  candidateId: string,
  targetCampsiteId: string,
  targetStartDate: string,
  targetEndDate: string,
  blackoutDates: BlackoutDate[]
): BlackoutDate[] {
  return blackoutDates.filter(b => {
    // Exclude current blackout (if moving/resizing blackout)
    if (b.id === candidateId) return false;

    // Only check blackouts on the same campsite (null means all sites)
    if (b.campsite_id !== targetCampsiteId && b.campsite_id !== null) return false;

    // Treat b.end_date as inclusive (last day of block)
    // Overlap requires exclusive end date for comparison
    const blackoutEndExclusive = format(addDays(parseISO(b.end_date), 1), 'yyyy-MM-dd');

    // Check overlap
    return datesOverlap(targetStartDate, targetEndDate, b.start_date, blackoutEndExclusive);
  });
}

// ============================================================================
// Move Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  conflicts?: Reservation[] | BlackoutDate[];
}

/**
 * Validate if a reservation or blackout can be moved/resized to new dates on a campsite.
 * Performs all validation checks: active campsite, date conflicts, etc.
 *
 * @param item - Reservation or blackout being moved/resized
 * @param targetCampsiteId - Target campsite ID (or 'UNASSIGNED')
 * @param targetStartDate - Target start date (yyyy-MM-dd)
 * @param targetEndDate - Target end date (yyyy-MM-dd, exclusive)
 * @param campsites - All campsites (for active check)
 * @param reservations - All reservations (for conflict check), empty array if validating blackout
 * @param blackoutDates - All blackout dates (for conflict check), empty array if validating reservation
 * @returns Validation result with valid flag and optional error message
 */
export function validateMove(
  item: ValidatableItem,
  targetCampsiteId: string,
  targetStartDate: string,
  targetEndDate: string,
  campsites: Campsite[],
  reservations: Reservation[] = [],
  blackoutDates: BlackoutDate[] = []
): ValidationResult {
  // Special case: Moving to Unassigned is always valid
  if (targetCampsiteId === 'UNASSIGNED') {
    return { valid: true, error: null };
  }

  // Check if campsite exists
  const targetCampsite = campsites.find(c => c.id === targetCampsiteId);
  if (!targetCampsite) {
    return { valid: false, error: 'Campsite not found' };
  }

  // Check if campsite is active
  if (!targetCampsite.is_active) {
    return { valid: false, error: 'Campsite is inactive' };
  }

  // Get item ID
  const itemId = isReservation(item) ? (item.id || '') : item.id;

  // Check for conflicts with reservations
  if (reservations.length > 0) {
    const reservationConflicts = getConflicts(
      itemId,
      targetCampsiteId,
      targetStartDate,
      targetEndDate,
      reservations
    );

    if (reservationConflicts.length > 0) {
      const conflict = reservationConflicts[0];
      return {
        valid: false,
        error: `Conflicts with ${conflict.first_name} ${conflict.last_name} reservation`,
        conflicts: reservationConflicts
      };
    }
  }

  // Check for conflicts with blackout dates
  if (blackoutDates.length > 0) {
    const blackoutConflicts = getBlackoutConflicts(
      itemId,
      targetCampsiteId,
      targetStartDate,
      targetEndDate,
      blackoutDates
    );

    if (blackoutConflicts.length > 0) {
      const conflict = blackoutConflicts[0];
      const reason = conflict.reason || 'Maintenance';
      return {
        valid: false,
        error: `Conflicts with blackout date: ${reason}`,
        conflicts: blackoutConflicts
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Check if a date range has minimum required duration (at least 1 night).
 *
 * @param checkIn - Check-in date (yyyy-MM-dd)
 * @param checkOut - Check-out date (yyyy-MM-dd, exclusive)
 * @returns Validation result
 */
export function validateMinimumDuration(
  checkIn: string,
  checkOut: string
): ValidationResult {
  if (checkOut <= checkIn) {
    return { valid: false, error: 'Minimum 1 night required' };
  }
  return { valid: true, error: null };
}
