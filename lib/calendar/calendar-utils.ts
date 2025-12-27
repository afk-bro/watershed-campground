/**
 * Pure utility functions for calendar date math, positioning, and hit testing.
 * All functions are pure (no side effects) and unit-testable.
 */

import { format, parseISO, differenceInDays, addDays, isSameDay as dateFnsIsSameDay } from 'date-fns';

// ============================================================================
// Date Math Utilities
// ============================================================================

/**
 * Clamp a date to be within a given range [min, max].
 * If date is before min, returns min. If after max, returns max.
 */
export function clampDate(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

/**
 * Calculate inclusive difference in days between two dates.
 * Unlike differenceInDays, this counts the end day as well.
 *
 * Example: diffDaysInclusive('2025-01-01', '2025-01-03') = 3 days
 */
export function diffDaysInclusive(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start) + 1;
}

/**
 * Check if two dates are the same day.
 */
export function isSameDay(dateA: string | Date, dateB: string | Date): boolean {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB;
  return dateFnsIsSameDay(a, b);
}

/**
 * Convert Date to yyyy-MM-dd string format.
 */
export function toYMD(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if a date string is within a given month range.
 * Month range is inclusive: [monthStart, monthEnd]
 */
export function isDateInMonthRange(dateStr: string, monthStart: Date, monthEnd: Date): boolean {
  const date = parseISO(dateStr);
  return date >= monthStart && date <= monthEnd;
}

/**
 * Calculate new end date preserving duration (in nights).
 *
 * Example: If old reservation was 3 nights (check-in to check-out),
 * and we move check-in, the new check-out maintains that 3-night duration.
 */
export function calculateNewEndDate(
  oldCheckIn: string,
  oldCheckOut: string,
  newCheckIn: string
): string {
  const durationNights = differenceInDays(parseISO(oldCheckOut), parseISO(oldCheckIn));
  const newCheckOut = addDays(parseISO(newCheckIn), durationNights);
  return format(newCheckOut, 'yyyy-MM-dd');
}

// ============================================================================
// Positioning Utilities
// ============================================================================

/**
 * Calculate block position on calendar grid.
 * Returns column start (offset from grid start) and column span (width in days).
 *
 * @param startDate - Block start date (yyyy-MM-dd)
 * @param endDate - Block end date (yyyy-MM-dd)
 * @param gridStart - Grid start date (usually monthStart)
 * @returns { colStart: number, colSpan: number }
 *
 * Example: Block from Jan 5-7 on grid starting Jan 1:
 *   colStart = 4 (offset 4 days)
 *   colSpan = 3 (spans 3 days inclusive)
 */
export function getBlockSpan(
  startDate: string,
  endDate: string,
  gridStart: Date
): { colStart: number; colSpan: number } {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const colStart = differenceInDays(start, gridStart);
  const colSpan = differenceInDays(end, start) + 1; // Inclusive

  return { colStart, colSpan };
}

/**
 * Calculate percentage-based position for block rendering.
 *
 * @param startDate - Block start date (yyyy-MM-dd)
 * @param endDate - Block end date (yyyy-MM-dd)
 * @param monthStart - Month start date
 * @param totalDays - Total days in month
 * @returns { leftPercent: number, widthPercent: number }
 */
export function getBlockPosition(
  startDate: string,
  endDate: string,
  monthStart: Date,
  totalDays: number
): { leftPercent: number; widthPercent: number } {
  const { colStart, colSpan } = getBlockSpan(startDate, endDate, monthStart);

  const leftPercent = (colStart / totalDays) * 100;
  const widthPercent = (colSpan / totalDays) * 100;

  return { leftPercent, widthPercent };
}

// ============================================================================
// Hit Testing Utilities
// ============================================================================

/**
 * Find the date (yyyy-MM-dd) of the calendar cell under the pointer.
 * Uses elementsFromPoint to penetrate through overlays.
 *
 * @param clientX - Mouse/pointer X coordinate
 * @param clientY - Mouse/pointer Y coordinate
 * @returns Date string (yyyy-MM-dd) or null if no date cell found
 */
export function getDateFromPointer(clientX: number, clientY: number): string | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  const dayCell = elements.find(el => el.hasAttribute('data-date'));
  if (dayCell) {
    return dayCell.getAttribute('data-date');
  }
  return null;
}

/**
 * Calculate drag offset - which day within a block the user clicked.
 *
 * @param clickX - Mouse X coordinate at click
 * @param clickY - Mouse Y coordinate at click
 * @param blockStartDate - Start date of the block being clicked (yyyy-MM-dd)
 * @returns Offset in days (0-based index from block start)
 */
export function calculateDragOffset(
  clickX: number,
  clickY: number,
  blockStartDate: string
): number {
  const clickedDate = getDateFromPointer(clickX, clickY);
  if (!clickedDate) return 0;

  const offsetDays = differenceInDays(parseISO(clickedDate), parseISO(blockStartDate));
  return Math.max(0, offsetDays); // Ensure non-negative
}

/**
 * Find the campsite ID of the calendar row under the pointer.
 * Uses elementsFromPoint to penetrate through overlays.
 *
 * @param clientX - Mouse/pointer X coordinate
 * @param clientY - Mouse/pointer Y coordinate
 * @returns Campsite ID string or null if no campsite row found
 */
export function getCampsiteFromPointer(clientX: number, clientY: number): string | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  
  // Look for campsite row
  const row = elements.find(el => el.hasAttribute('data-campsite-id'));
  if (row) {
    return row.getAttribute('data-campsite-id');
  }

  // Also check for individual cells which might have resourceId (less reliable if overlays exist but good backup)
  // But strictly we should rely on the row or properly tagged elements
  
  return null;
}
