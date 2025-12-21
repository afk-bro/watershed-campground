/**
 * useDragResize - Custom hook for calendar drag and resize operations
 *
 * Handles:
 * - Dragging reservations and blackout dates between campsites/dates
 * - Resizing reservations and blackouts by dragging edges
 * - Real-time validation during operations
 * - Ghost preview generation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';
import type { GhostState } from '@/lib/calendar/calendar-types';
import {
  isDateInMonthRange,
  getDateFromPointer,
  calculateDragOffset,
} from '@/lib/calendar/calendar-utils';
import {
  computeDragDates,
  computeResizeDates,
  validateCandidate,
  buildGhostState,
  DragResizeItem,
  getStartDate,
  getEndDate
} from './drag-helpers';

// Re-export DragResizeItem for use in other components
export type { DragResizeItem } from './drag-helpers';

type ResizeSide = "left" | "right";

function getCampsiteId(item: DragResizeItem): string {
  const id = 'campsite_id' in item ? item.campsite_id : null;
  return id || 'UNASSIGNED';
}

function isReservation(item: DragResizeItem): item is Reservation {
  return 'check_in' in item;
}

interface DragPreview {
  campsiteId: string;
  startDate: string;
  endDate: string;
  itemType: 'reservation' | 'blackout';
}

export interface ResizeState {
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
  handleDrop: (e: React.DragEvent, campsiteId: string, dateStr: string) => void;
  handleDragEnd: () => void;

  // Resize handlers (overloaded)
  handleResizeStart: (item: DragResizeItem, side: ResizeSide) => void;

  // Ghost preview
  getGhost: (resourceId: string) => GhostState | null;

  // Access current ref state (safe for callbacks)
  getDragState: () => {
    draggedItem: DragResizeItem | null;
    dragPreview: DragPreview | null;
    validationError: string | null;
  };
}

type ThrottledDragPreview = ((campsiteId: string, dateStr: string) => void) & { cancel: () => void };
type ThrottledResizePreview = ((e: PointerEvent) => void) & { cancel: () => void };

function createThrottleDrag(fn: (campsiteId: string, dateStr: string) => void, wait: number): ThrottledDragPreview {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: [string, string] | null = null;

  const throttled = (campsiteId: string, dateStr: string) => {
    lastArgs = [campsiteId, dateStr];

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        timeout = null;
        lastArgs = null;
      }, wait);
    }
  };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = null;
    lastArgs = null;
  };

  return throttled;
}

function createThrottleResize(fn: (e: PointerEvent) => void, wait: number): ThrottledResizePreview {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastEvt: PointerEvent | null = null;

  const throttled = (e: PointerEvent) => {
    lastEvt = e;
    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastEvt) {
          fn(lastEvt);
        }
        timeout = null;
        lastEvt = null;
      }, wait);
    }
  };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = null;
    lastEvt = null;
  };

  return throttled;
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

  // Refs for stable access in event handlers (fixes stale closure issues in memoized cells)
  const draggedItemRef = useRef<DragResizeItem | null>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);
  const validationErrorRef = useRef<string | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const dragOffsetDaysRef = useRef<number>(0);
  const throttledDragPreviewRef = useRef<ThrottledDragPreview | null>(null);
  const throttledResizePreviewRef = useRef<ThrottledResizePreview | null>(null);

  // Sync refs with state
  useEffect(() => { draggedItemRef.current = draggedItem; }, [draggedItem]);
  useEffect(() => { dragPreviewRef.current = dragPreview; }, [dragPreview]);
  useEffect(() => { validationErrorRef.current = validationError; }, [validationError]);
  useEffect(() => { resizeStateRef.current = resizeState; }, [resizeState]);
  useEffect(() => { dragOffsetDaysRef.current = dragOffsetDays; }, [dragOffsetDays]);

  // Robust setters to keep ref and state in sync immediately
  const setDraggedItemBoth = useCallback((item: DragResizeItem | null) => {
    draggedItemRef.current = item;
    setDraggedItem(item);
  }, []);

  const setDragPreviewBoth = useCallback((preview: DragPreview | null) => {
    dragPreviewRef.current = preview;
    setDragPreview(preview);
  }, []);

  const setValidationErrorBoth = useCallback((error: string | null) => {
    validationErrorRef.current = error;
    setValidationError(error);
  }, []);

  const setResizeStateBoth = useCallback((state: ResizeState | null) => {
    resizeStateRef.current = state;
    setResizeState(state);
  }, []);

  // Helper to get current state (useful for consumers if needed)
  const getDragState = useCallback(() => ({
    draggedItem: draggedItemRef.current,
    dragPreview: dragPreviewRef.current,
    validationError: validationErrorRef.current,
  }), []);

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleDragStart = useCallback((e: React.DragEvent, item: DragResizeItem) => {
    const itemId = isReservation(item) ? item.id : item.id;
    const itemType = isReservation(item) ? 'reservation' : 'blackout';
    console.log('[DRAG START]', { itemId, itemType, isDragging: true });

    // Manual ref sync for immediate access
    draggedItemRef.current = item;

    setIsDragging(true);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // Essential for DnD to work in many browsers (e.g. Firefox)
    e.dataTransfer.setData('text/plain', itemId || '');

    // Calculate drag offset using utility function
    const startDate = getStartDate(item);
    const offsetDays = calculateDragOffset(e.clientX, e.clientY, startDate);

    setDragOffsetDays(offsetDays);
    dragOffsetDaysRef.current = offsetDays;

    console.log('[DRAG START] Offset:', offsetDays, 'days from start date');
  }, []);

  // Store the actual heavy logic separately
  // Store the actual heavy logic separately
  const updateDragPreview = useCallback((campsiteId: string, dateStr: string) => {
    // Read from refs to avoid stale closures in memoized cells
    const currentDraggedItem = draggedItemRef.current;
    const currentDragOffsetDays = dragOffsetDaysRef.current;

    if (!currentDraggedItem) return;

    const itemType = isReservation(currentDraggedItem) ? 'reservation' : 'blackout';

    // Use helper to calculate dates and initial validation
    const result = computeDragDates(
      currentDraggedItem,
      currentDragOffsetDays,
      dateStr,
      monthStart,
      monthEnd
    );

    if (!result.isValid) {
      setDragPreview({
        campsiteId,
        startDate: result.startDate,
        endDate: result.endDate,
        itemType
      });
      setValidationError(result.error || 'Invalid move');
      return;
    }

    // Validate against constraints (conflicts)
    const validation = validateCandidate(
      currentDraggedItem,
      campsiteId,
      result.startDate,
      result.endDate,
      campsites,
      reservations,
      blackoutDates
    );

    const newPreview: DragPreview = {
      campsiteId,
      startDate: result.startDate,
      endDate: result.endDate,
      itemType
    };

    // Update preview state and ref
    setDragPreview(newPreview);
    dragPreviewRef.current = newPreview;

    setValidationError(validation.valid ? null : validation.error);
    validationErrorRef.current = validation.valid ? null : validation.error;
  }, [monthStart, monthEnd, campsites, reservations, blackoutDates]);

  // Create throttled drag preview updater after render to avoid accessing refs during render
  useEffect(() => {
    const fn = createThrottleDrag((campsiteId: string, dateStr: string) => {
      updateDragPreview(campsiteId, dateStr);
    }, 16);

    throttledDragPreviewRef.current = fn;

    return () => {
      fn.cancel();
      throttledDragPreviewRef.current = null;
    };
  }, [updateDragPreview]);

  const handleDragOverCell = useCallback((campsiteId: string, dateStr: string) => {
    throttledDragPreviewRef.current?.(campsiteId, dateStr);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    // Read from refs to ensure latest state without trigger re-renders or stale closures
    const currentDragPreview = dragPreviewRef.current;
    const currentValidationError = validationErrorRef.current;
    const currentDraggedItem = draggedItemRef.current;

    console.log('[DROP] Event fired', {
      hasDragPreview: !!currentDragPreview,
      hasValidationError: !!currentValidationError,
      hasDraggedItem: !!currentDraggedItem
    });

    if (!currentDragPreview || currentValidationError || !currentDraggedItem) {
      console.log('[DROP] Ignored due to missing state or error', { dragPreview: currentDragPreview, validationError: currentValidationError, draggedItem: currentDraggedItem });
      // Snap back - invalid drop
      return;
    }

    // Check for "no change" scenario
    const currentCampsiteId = getCampsiteId(currentDraggedItem);
    const currentStartDate = getStartDate(currentDraggedItem);
    const currentEndDate = getEndDate(currentDraggedItem);
    const noChange =
      currentCampsiteId === currentDragPreview.campsiteId &&
      currentStartDate === currentDragPreview.startDate &&
      currentEndDate === currentDragPreview.endDate;

    if (noChange) {
      console.log('[DROP] No change detected');
      return;
    }

    console.log('[DROP] Valid move requested', {
      itemType: isReservation(currentDraggedItem) ? 'reservation' : 'blackout',
      to: currentDragPreview
    });

    // Request move from parent - call appropriate callback
    if (isReservation(currentDraggedItem)) {
      onReservationMoveRequested(
        currentDraggedItem,
        currentDragPreview.campsiteId,
        currentDragPreview.startDate,
        currentDragPreview.endDate
      );
    } else {
      onBlackoutMoveRequested(
        currentDraggedItem,
        currentDragPreview.campsiteId,
        currentDragPreview.startDate,
        currentDragPreview.endDate
      );
    }
  }, [onReservationMoveRequested, onBlackoutMoveRequested]);

  const handleDragEnd = useCallback(() => {
    console.log('[DRAG END] Cleaning up state');

    // Clear refs immediately
    draggedItemRef.current = null;
    dragPreviewRef.current = null;
    validationErrorRef.current = null;
    dragOffsetDaysRef.current = 0;

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

    // Use helper for calculation
    const result = computeResizeDates(
      resizeState.originalStartDate,
      resizeState.originalEndDate,
      resizeState.side,
      hoveredDate,
      monthStart,
      monthEnd
    );

    // Always update state first (so ghost preview shows)
    setResizeState(prev => prev ? {
      ...prev,
      newStartDate: result.newStartDate,
      newEndDate: result.newEndDate
    } : null);

    if (!result.isValid) {
      setValidationError(result.error || 'Invalid resize');
      return;
    }

    // Sync validation for conflicts
    const campsiteId = getCampsiteId(resizeState.item);
    const validation = validateCandidate(
      resizeState.item,
      campsiteId,
      result.newStartDate,
      result.newEndDate,
      campsites,
      reservations,
      blackoutDates
    );

    setValidationError(validation.valid ? null : validation.error);
  }, [resizeState, monthStart, monthEnd, campsites, reservations, blackoutDates]);

  // Throttled resize handler - 16ms for smooth ~60fps
  useEffect(() => {
    const fn = createThrottleResize((e: PointerEvent) => {
      updateResizePreview(e);
    }, 16);

    throttledResizePreviewRef.current = fn;

    return () => {
      fn.cancel();
      throttledResizePreviewRef.current = null;
    };
  }, [updateResizePreview]);

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeState) return;

    // Update auto-scroll direction immediately (visual feedback)
    updateScrollDirection(e.clientX, e.clientY);

    // Throttle the heavy validation and state updates
    throttledResizePreviewRef.current?.(e);
  }, [resizeState, updateScrollDirection]);

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
      window.addEventListener('pointermove', handleResizeMove as unknown as EventListener);
      window.addEventListener('pointerup', handleResizeEnd);
      return () => {
        window.removeEventListener('pointermove', handleResizeMove as unknown as EventListener);
        window.removeEventListener('pointerup', handleResizeEnd);
      };
    }
  }, [resizeState, handleResizeMove, handleResizeEnd]);

  // ============================================================================
  // Ghost Preview Converters
  // ============================================================================

  const getDragGhost = useCallback((resourceId: string): GhostState | null => {
    if (!dragPreview || dragPreview.campsiteId !== resourceId) return null;
    return buildGhostState(
      'move',
      dragPreview.campsiteId,
      dragPreview.startDate,
      dragPreview.endDate,
      validationError
    );
  }, [dragPreview, validationError]);

  const getResizeGhost = useCallback((resourceId: string): GhostState | null => {
    if (!resizeState) return null;
    const blockResourceId = getCampsiteId(resizeState.item);
    if (blockResourceId !== resourceId) return null;

    return buildGhostState(
      resizeState.side === 'left' ? 'resize-start' : 'resize-end',
      blockResourceId,
      resizeState.newStartDate,
      resizeState.newEndDate,
      validationError
    );
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
    getDragState,
  };
}
