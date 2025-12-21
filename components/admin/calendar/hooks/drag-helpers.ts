import { format, parseISO, subDays, addDays } from 'date-fns';
import {
    isDateInMonthRange,
    calculateNewEndDate,
    getDateFromPointer
} from '@/lib/calendar/calendar-utils';
import { validateMove, ValidationResult } from '@/lib/calendar/calendar-validation';
// import { DragResizeItem, DragPreview, ResizeState } from './useDragResize'; // Circular dependency
import { GhostState } from '@/lib/calendar/calendar-types';
import { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';

export type DragResizeItem = Reservation | BlackoutDate;

// Re-export type guards if needed or pass type explicitly
function isReservation(item: DragResizeItem): item is Reservation {
    return 'check_in' in item;
}

function isBlackout(item: DragResizeItem): item is BlackoutDate {
    return 'start_date' in item;
}

export function getStartDate(item: DragResizeItem): string {
    return isReservation(item) ? item.check_in : item.start_date;
}

export function getEndDate(item: DragResizeItem): string {
    return isReservation(item) ? item.check_out : item.end_date;
}

/**
 * Calculate new dates for a drag operation.
 */
export function computeDragDates(
    item: DragResizeItem,
    dragOffsetDays: number,
    cursorDateStr: string,
    monthStart: Date,
    monthEnd: Date
): {
    startDate: string;
    endDate: string;
    isValid: boolean;
    error?: string;
} {
    const cursorDate = parseISO(cursorDateStr);
    const adjustedStartDate = format(subDays(cursorDate, dragOffsetDays), 'yyyy-MM-dd');

    // Check month range
    if (!isDateInMonthRange(adjustedStartDate, monthStart, monthEnd)) {
        return {
            startDate: adjustedStartDate,
            endDate: adjustedStartDate, // Placeholder
            isValid: false,
            error: 'Out of month range'
        };
    }

    // Calculate new end date (preserve duration)
    const originalStartDate = getStartDate(item);
    const originalEndDate = getEndDate(item);
    const endDate = calculateNewEndDate(
        originalStartDate,
        originalEndDate,
        adjustedStartDate
    );

    return {
        startDate: adjustedStartDate,
        endDate,
        isValid: true
    };
}

/**
 * Calculate new dates for a resize operation.
 */
export function computeResizeDates(
    originalStartDate: string,
    originalEndDate: string,
    side: 'left' | 'right',
    cursorDateStr: string,
    monthStart: Date,
    monthEnd: Date
): {
    newStartDate: string;
    newEndDate: string;
    isValid: boolean;
    error?: string;
} {
    let newStartDate = originalStartDate;
    let newEndDate = originalEndDate;

    if (side === 'left') {
        newStartDate = cursorDateStr;
    } else {
        // Resizing right handle (changing end date)
        // Add 1 day since end dates are exclusive in our system
        const hoveredDateObj = parseISO(cursorDateStr);
        newEndDate = format(addDays(hoveredDateObj, 1), 'yyyy-MM-dd');
    }

    // Check month range
    if (!isDateInMonthRange(cursorDateStr, monthStart, monthEnd)) {
        return { newStartDate, newEndDate, isValid: false, error: 'Out of month range' };
    }

    // Validate minimum duration (1 night)
    if (newEndDate <= newStartDate) {
        return { newStartDate, newEndDate, isValid: false, error: 'Minimum 1 night required' };
    }

    return { newStartDate, newEndDate, isValid: true };
}

/**
 * Validate a candidate move/resize against data.
 */
export function validateCandidate(
    item: DragResizeItem,
    campsiteId: string,
    startDate: string,
    endDate: string,
    campsites: Campsite[],
    reservations: Reservation[],
    blackoutDates: BlackoutDate[]
): ValidationResult {
    return validateMove(
        item,
        campsiteId,
        startDate,
        endDate,
        campsites,
        isReservation(item) ? reservations : [],
        isBlackout(item) ? blackoutDates : []
    );
}

/**
 * Build a consistent ghost state object.
 */
export function buildGhostState(
    mode: 'move' | 'resize-start' | 'resize-end',
    resourceId: string,
    startDate: string,
    endDate: string,
    validationError: string | null
): GhostState {
    return {
        mode,
        resourceId,
        startDate,
        endDate,
        isValid: !validationError,
        errorMessage: validationError || undefined
    };
}
