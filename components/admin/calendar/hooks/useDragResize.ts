/**
 * useDragResize - Custom hook for calendar drag and resize operations
 *
 * Handles:
 * - Dragging reservations and blackout dates between campsites/dates
 * - Resizing reservations and blackouts by dragging edges
 * - Real-time validation during operations
 * - Ghost preview generation
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, differenceInDays, addDays, subDays } from 'date-fns';
import type { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';
import type { GhostState } from '@/lib/calendar/calendar-types';
import {
  isDateInMonthRange,
  calculateNewEndDate,
  getDateFromPointer,
  calculateDragOffset,
} from '@/lib/calendar/calendar-utils';
import { validateMove } from '@/lib/calendar/calendar-validation';

type ResizeSide = "left" | "right";

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Union type for items that can be dragged/resized
 */
export type DragResizeItem = Reservation | BlackoutDate;

/**
 * Type guard: Check if item is a reservation
 */
function isReservation(item: DragResizeItem): item is Reservation {
  return 'check_in' in item && 'check_out' in item;
}

/**
 * Type guard: Check if item is a blackout date
 */
function isBlackout(item: DragResizeItem): item is BlackoutDate {
  return 'start_date' in item && 'end_date' in item;
}

/**
 * Get start date from either reservation or blackout
 */
function getStartDate(item: DragResizeItem): string {
  return isReservation(item) ? item.check_in : item.start_date;
}

/**
 * Get end date from either reservation or blackout
 */
function getEndDate(item: DragResizeItem): string {
  return isReservation(item) ? item.check_out : item.end_date;
}

/**
 * Get campsite ID from either reservation or blackout
 */
function getCampsiteId(item: DragResizeItem): string {
  const id = isReservation(item) ? item.campsite_id : item.campsite_id;
  return id || 'UNASSIGNED';
}

interface DragPreview {
  campsiteId: string;
  startDate: string;
  endDate: string;
  itemType: 'reservation' | 'blackout';
}

interface ResizeState {
  item: DragResizeItem;
  side: ResizeSide;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
}

export interface UseDragResizeReturn {
  // Drag state
  isDragging: boolean;
  draggedItem: DragResizeItem | null;
  dragPreview: DragPreview | null;

  // Resize state
  resizeState: ResizeState | null;

  // Validation
  validationError: string | null;

  // Drag handlers (overloaded)
  handleDragStart: (e: React.DragEvent, item: DragResizeItem) => void;
  handleDragOverCell: (campsiteId: string, dateStr: string) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragEnd: () => void;

  // Resize handlers (overloaded)
  handleResizeStart: (item: DragResizeItem, side: ResizeSide) => void;

  // Ghost preview
  getGhost: (resourceId: string) => GhostState | null;
}

// Throttle utility for performance optimization
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    lastArgs = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeout = null;
        lastArgs = null;
      }, wait);
    }
  };
}

export interface UseDragResizeConfig {
  monthStart: Date;
  monthEnd: Date;
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  autoScrollIntervalRef: React.MutableRefObject<number | null>;
  onReservationMoveRequested: (
    reservation: Reservation,
    newCampsiteId: string,
    newStartDate: string,
    newEndDate: string
  ) => void;
  onBlackoutMoveRequested: (
    blackout: BlackoutDate,
    newCampsiteId: string,
    newStartDate: string,
    newEndDate: string
  ) => void;
  updateScrollDirection: (clientX: number, clientY: number) => void;
  stopAutoScroll: () => void;
}

/**
 * Hook for managing drag and resize operations on calendar reservations and blackouts
 */
export function useDragResize({
  monthStart,
  monthEnd,
  campsites,
  reservations,
  blackoutDates,
  autoScrollIntervalRef,
  onReservationMoveRequested,
  onBlackoutMoveRequested,
  updateScrollDirection,
  stopAutoScroll,
}: UseDragResizeConfig): UseDragResizeReturn {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragResizeItem | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleDragStart = useCallback((e: React.DragEvent, item: DragResizeItem) => {
    const itemId = isReservation(item) ? item.id : item.id;
    const itemType = isReservation(item) ? 'reservation' : 'blackout';
    console.log('[DRAG START]', { itemId, itemType, isDragging: true });
    setIsDragging(true);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';

    // Calculate drag offset using utility function
    const startDate = getStartDate(item);
    const offsetDays = calculateDragOffset(e.clientX, e.clientY, startDate);
    setDragOffsetDays(offsetDays);
    console.log('[DRAG START] Offset:', offsetDays, 'days from start date');
  }, []);

  // Store the actual heavy logic separately
  const updateDragPreview = useCallback((campsiteId: string, dateStr: string) => {
    if (!draggedItem) return;

    const itemType = isReservation(draggedItem) ? 'reservation' : 'blackout';

    // Adjust for drag offset
    const cursorDate = parseISO(dateStr);
    const adjustedStartDate = format(subDays(cursorDate, dragOffsetDays), 'yyyy-MM-dd');

    console.log('[DRAG PREVIEW]', {
      cursorOn: dateStr,
      offsetDays: dragOffsetDays,
      adjustedStartDate,
      itemType
    });

    // Check if adjusted date is out of current month range
    if (!isDateInMonthRange(adjustedStartDate, monthStart, monthEnd)) {
      setDragPreview({ campsiteId, startDate: adjustedStartDate, endDate: adjustedStartDate, itemType });
      setValidationError('Out of month range');
      return;
    }

    // Calculate new end date (preserve duration)
    const originalStartDate = getStartDate(draggedItem);
    const originalEndDate = getEndDate(draggedItem);
    const endDate = calculateNewEndDate(
      originalStartDate,
      originalEndDate,
      adjustedStartDate
    );

    // SYNC validation (fast, no await)
    // For reservations, use existing validation
    // For blackouts, we'll validate conflicts with reservations and other blackouts
    const validation = validateMove(
      draggedItem,
      campsiteId,
      adjustedStartDate,
      endDate,
      campsites,
      isReservation(draggedItem) ? reservations : [],
      isBlackout(draggedItem) ? blackoutDates : []
    );

    // Update preview state
    setDragPreview({ campsiteId, startDate: adjustedStartDate, endDate, itemType });
    setValidationError(validation.valid ? null : validation.error);
  }, [draggedItem, dragOffsetDays, monthStart, monthEnd, campsites, reservations, blackoutDates]);

  // Throttled version - only runs every 16ms (~60fps)
  const handleDragOverCell = useMemo(
    () => throttle(updateDragPreview, 16),
    [updateDragPreview]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    if (!dragPreview || validationError || !draggedItem) {
      // Snap back - invalid drop
      return;
    }

    // Check for "no change" scenario
    const currentCampsiteId = getCampsiteId(draggedItem);
    const currentStartDate = getStartDate(draggedItem);
    const currentEndDate = getEndDate(draggedItem);
    const noChange =
      currentCampsiteId === dragPreview.campsiteId &&
      currentStartDate === dragPreview.startDate &&
      currentEndDate === dragPreview.endDate;

    if (noChange) {
      // Parent should show toast
      return;
    }

    // Request move from parent - call appropriate callback
    if (isReservation(draggedItem)) {
      onReservationMoveRequested(
        draggedItem,
        dragPreview.campsiteId,
        dragPreview.startDate,
        dragPreview.endDate
      );
    } else {
      onBlackoutMoveRequested(
        draggedItem,
        dragPreview.campsiteId,
        dragPreview.startDate,
        dragPreview.endDate
      );
    }
  }, [dragPreview, validationError, draggedItem, onReservationMoveRequested, onBlackoutMoveRequested]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragOffsetDays(0);
    setDragPreview(null);
    setValidationError(null);

    // Stop auto-scroll
    if (autoScrollIntervalRef.current) {
      window.clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, [autoScrollIntervalRef]);

  // ============================================================================
  // Resize Handlers
  // ============================================================================

  const handleResizeStart = useCallback((item: DragResizeItem, side: ResizeSide) => {
    const startDate = getStartDate(item);
    const endDate = getEndDate(item);
    setResizeState({
      item,
      side,
      originalStartDate: startDate,
      originalEndDate: endDate,
      newStartDate: startDate,
      newEndDate: endDate,
    });
  }, []);

  // Heavy resize logic - separated for throttling
  const updateResizePreview = useCallback((e: PointerEvent) => {
    if (!resizeState) return;

    const hoveredDate = getDateFromPointer(e.clientX, e.clientY);
    if (!hoveredDate) return;

    let newStartDate = resizeState.originalStartDate;
    let newEndDate = resizeState.originalEndDate;

    if (resizeState.side === 'left') {
      // Resizing left handle (changing start date)
      newStartDate = hoveredDate;
    } else {
      // Resizing right handle (changing end date)
      // Add 1 day since end dates are exclusive
      const hoveredDateObj = parseISO(hoveredDate);
      newEndDate = format(addDays(hoveredDateObj, 1), 'yyyy-MM-dd');
    }

    // Always update state first (so ghost preview shows)
    setResizeState(prev => prev ? { ...prev, newStartDate, newEndDate } : null);

    // Then validate and set errors
    // Check if date is within month range
    if (!isDateInMonthRange(hoveredDate, monthStart, monthEnd)) {
      setValidationError('Out of month range');
      return;
    }

    // Validate: must have at least 1 night
    if (newEndDate <= newStartDate) {
      setValidationError('Minimum 1 night required');
      return;
    }

    // Sync validation for conflicts
    const campsiteId = getCampsiteId(resizeState.item);
    const validation = validateMove(
      resizeState.item,
      campsiteId,
      newStartDate,
      newEndDate,
      campsites,
      isReservation(resizeState.item) ? reservations : [],
      isBlackout(resizeState.item) ? blackoutDates : []
    );

    setValidationError(validation.valid ? null : validation.error);
  }, [resizeState, monthStart, monthEnd, campsites, reservations, blackoutDates]);

  // Throttled resize handler - 16ms for smooth ~60fps
  const throttledResizePreview = useMemo(
    () => throttle(updateResizePreview, 16),
    [updateResizePreview]
  );

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeState) return;

    // Update auto-scroll direction immediately (visual feedback)
    updateScrollDirection(e.clientX, e.clientY);

    // Throttle the heavy validation and state updates
    throttledResizePreview(e);
  }, [resizeState, updateScrollDirection, throttledResizePreview]);

  const handleResizeEnd = useCallback(() => {
    // Stop auto-scroll
    stopAutoScroll();

    if (!resizeState) return;

    // Check for validation errors
    if (validationError) {
      // Snap back - invalid resize
      setResizeState(null);
      setValidationError(null);
      return;
    }

    // Check for no change
    const noChange =
      resizeState.newStartDate === resizeState.originalStartDate &&
      resizeState.newEndDate === resizeState.originalEndDate;

    if (noChange) {
      setResizeState(null);
      return;
    }

    // Valid resize - request move from parent using appropriate callback
    const campsiteId = getCampsiteId(resizeState.item);
    if (isReservation(resizeState.item)) {
      onReservationMoveRequested(
        resizeState.item,
        campsiteId,
        resizeState.newStartDate,
        resizeState.newEndDate
      );
    } else {
      onBlackoutMoveRequested(
        resizeState.item,
        campsiteId,
        resizeState.newStartDate,
        resizeState.newEndDate
      );
    }
    setResizeState(null);
  }, [resizeState, validationError, onReservationMoveRequested, onBlackoutMoveRequested, stopAutoScroll]);

  // Add/remove window pointer listeners for resize
  useEffect(() => {
    if (resizeState) {
      window.addEventListener('pointermove', handleResizeMove as any);
      window.addEventListener('pointerup', handleResizeEnd);
      return () => {
        window.removeEventListener('pointermove', handleResizeMove as any);
        window.removeEventListener('pointerup', handleResizeEnd);
      };
    }
  }, [resizeState, handleResizeMove, handleResizeEnd]);

  // ============================================================================
  // Ghost Preview Converters
  // ============================================================================

  const getDragGhost = useCallback((resourceId: string): GhostState | null => {
    if (!dragPreview || dragPreview.campsiteId !== resourceId) return null;
    return {
      mode: 'move',
      resourceId: dragPreview.campsiteId,
      startDate: dragPreview.startDate,
      endDate: dragPreview.endDate,
      isValid: !validationError,
      errorMessage: validationError || undefined,
    };
  }, [dragPreview, validationError]);

  const getResizeGhost = useCallback((resourceId: string): GhostState | null => {
    if (!resizeState) return null;
    const blockResourceId = getCampsiteId(resizeState.item);
    if (blockResourceId !== resourceId) return null;

    return {
      mode: resizeState.side === 'left' ? 'resize-start' : 'resize-end',
      resourceId: blockResourceId,
      startDate: resizeState.newStartDate,
      endDate: resizeState.newEndDate,
      isValid: !validationError,
      errorMessage: validationError || undefined,
    };
  }, [resizeState, validationError]);

  // Unified ghost: drag takes precedence over resize
  const getGhost = useCallback((resourceId: string): GhostState | null => {
    return getDragGhost(resourceId) || getResizeGhost(resourceId);
  }, [getDragGhost, getResizeGhost]);

  return {
    isDragging,
    draggedItem,
    dragPreview,
    resizeState,
    validationError,
    handleDragStart,
    handleDragOverCell,
    handleDrop,
    handleDragEnd,
    handleResizeStart,
    getGhost,
  };
}
