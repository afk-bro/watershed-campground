"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';
import type { GhostState } from '@/lib/calendar/calendar-types';
import {
  getDateFromPointer,
  calculateDragOffset,
  getCampsiteFromPointer,
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
import { throttle, ThrottledFn } from '@/lib/calendar/calendar-throttle';

export type { DragResizeItem } from './drag-helpers';
export type ResizeSide = "left" | "right";

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
  isDragging: boolean;
  draggedItem: DragResizeItem | null;
  dragPreview: DragPreview | null;
  resizeState: ResizeState | null;
  validationError: string | null;
  handleDragPointerDown: (e: React.PointerEvent, item: DragResizeItem) => void;
  handleResizeStart: (item: DragResizeItem, side: ResizeSide) => void;
  getGhost: (resourceId: string) => GhostState | null;
  getDragState: () => {
    draggedItem: DragResizeItem | null;
    dragPreview: DragPreview | null;
    validationError: string | null;
  };
}

export interface UseDragResizeConfig {
  monthStart: Date;
  monthEnd: Date;
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
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

export function useDragResize({
  monthStart,
  monthEnd,
  campsites,
  reservations,
  blackoutDates,
  onReservationMoveRequested,
  onBlackoutMoveRequested,
  updateScrollDirection,
  stopAutoScroll,
}: UseDragResizeConfig): UseDragResizeReturn {
  // Primary State
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragResizeItem | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // High-frequency Internal State (Refs only to avoid stale closures in listeners)
  const draggedItemRef = useRef<DragResizeItem | null>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);
  const validationErrorRef = useRef<string | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const dragOffsetDaysRef = useRef<number>(0);

  // Persistent Throttlers
  const throttledDragRef = useRef<ThrottledFn | null>(null);
  const throttledResizeRef = useRef<ThrottledFn | null>(null);

  // Unified State/Ref Syncing
  const updateDraggedItem = useCallback((item: DragResizeItem | null) => {
    draggedItemRef.current = item;
    setDraggedItem(item);
  }, []);

  const updateDragPreview = useCallback((preview: DragPreview | null) => {
    dragPreviewRef.current = preview;
    setDragPreview(preview);
  }, []);

  const updateValidationError = useCallback((error: string | null) => {
    validationErrorRef.current = error;
    setValidationError(error);
  }, []);

  const updateResizeState = useCallback((state: ResizeState | null) => {
    resizeStateRef.current = state;
    setResizeState(state);
  }, []);

  const clearOperationState = useCallback(() => {
    stopAutoScroll();
    setIsDragging(false);
    updateDraggedItem(null);
    updateDragPreview(null);
    updateResizeState(null);
    updateValidationError(null);
    dragOffsetDaysRef.current = 0;

    throttledDragRef.current?.cancel();
    throttledResizeRef.current?.cancel();
  }, [stopAutoScroll, updateDraggedItem, updateDragPreview, updateResizeState, updateValidationError]);

  // Logic: Drag Preview Computation
  const computeAndSetDragPreview = useCallback((e: PointerEvent) => {
    const item = draggedItemRef.current;
    if (!item) return;

    const dateStr = getDateFromPointer(e.clientX, e.clientY);
    const campsiteId = getCampsiteFromPointer(e.clientX, e.clientY);

    if (!dateStr || !campsiteId) {
      updateDragPreview(null);
      updateValidationError(null);
      return;
    }

    const { startDate, endDate, isValid, error } = computeDragDates(
      item,
      dragOffsetDaysRef.current,
      dateStr,
      monthStart,
      monthEnd
    );

    const itemType = 'check_in' in item ? 'reservation' : 'blackout';
    const preview: DragPreview = { campsiteId, startDate, endDate, itemType };

    if (!isValid) {
      updateDragPreview(preview);
      updateValidationError(error || 'Invalid move');
      return;
    }

    const validation = validateCandidate(item, campsiteId, startDate, endDate, campsites, reservations, blackoutDates);
    updateDragPreview(preview);
    updateValidationError(validation.valid ? null : validation.error);
  }, [monthStart, monthEnd, campsites, reservations, blackoutDates, updateDragPreview, updateValidationError]);

  // Logic: Resize Preview Computation
  const computeAndSetResizePreview = useCallback((e: PointerEvent) => {
    const state = resizeStateRef.current;
    if (!state) return;

    const hoveredDate = getDateFromPointer(e.clientX, e.clientY);
    if (!hoveredDate) return;

    const result = computeResizeDates(
      state.originalStartDate,
      state.originalEndDate,
      state.side,
      hoveredDate,
      monthStart,
      monthEnd
    );

    // Update state so ghost shows immediately
    updateResizeState({
      ...state,
      newStartDate: result.newStartDate,
      newEndDate: result.newEndDate
    });

    if (!result.isValid) {
      updateValidationError(result.error || 'Invalid resize');
      return;
    }

    const campsiteId = 'campsite_id' in state.item ? (state.item.campsite_id || 'UNASSIGNED') : 'UNASSIGNED';
    const validation = validateCandidate(state.item, campsiteId, result.newStartDate, result.newEndDate, campsites, reservations, blackoutDates);
    updateValidationError(validation.valid ? null : validation.error);
  }, [monthStart, monthEnd, campsites, reservations, blackoutDates, updateResizeState, updateValidationError]);

  // Initialize Throttlers
  useEffect(() => {
    throttledDragRef.current = throttle(computeAndSetDragPreview, 16);
    throttledResizeRef.current = throttle(computeAndSetResizePreview, 16);
    return () => {
      throttledDragRef.current?.cancel();
      throttledResizeRef.current?.cancel();
    };
  }, [computeAndSetDragPreview, computeAndSetResizePreview]);

  // Handlers
  const handleDragPointerDown = useCallback((e: React.PointerEvent, item: DragResizeItem) => {
    e.preventDefault();
    e.stopPropagation();

    const startDate = getStartDate(item);
    dragOffsetDaysRef.current = calculateDragOffset(e.clientX, e.clientY, startDate);

    setIsDragging(true);
    updateDraggedItem(item);
  }, [updateDraggedItem]);

  const handleResizeStart = useCallback((item: DragResizeItem, side: ResizeSide) => {
    const startDate = getStartDate(item);
    const endDate = getEndDate(item);
    updateResizeState({
      item,
      side,
      originalStartDate: startDate,
      originalEndDate: endDate,
      newStartDate: startDate,
      newEndDate: endDate,
    });
  }, [updateResizeState]);

  // Global Listeners for active operations
  useEffect(() => {
    if (!isDragging && !resizeState) return;

    const onMove = (e: PointerEvent) => {
      updateScrollDirection(e.clientX, e.clientY);
      if (isDragging) throttledDragRef.current?.(e);
      else throttledResizeRef.current?.(e);
    };

    const onEnd = (e: PointerEvent) => {
      const item = draggedItemRef.current || resizeStateRef.current?.item;
      const preview = dragPreviewRef.current;
      const resize = resizeStateRef.current;
      const error = validationErrorRef.current;

      clearOperationState();

      if (!item || error) return;

      let finalCampsiteId: string;
      let finalStart: string;
      let finalEnd: string;

      if (isDragging && preview) {
        finalCampsiteId = preview.campsiteId;
        finalStart = preview.startDate;
        finalEnd = preview.endDate;
      } else if (!isDragging && resize) {
        finalCampsiteId = 'campsite_id' in resize.item ? (resize.item.campsite_id || 'UNASSIGNED') : 'UNASSIGNED';
        finalStart = resize.newStartDate;
        finalEnd = resize.newEndDate;
      } else return;

      // Check for change
      if (finalStart === getStartDate(item) && finalEnd === getEndDate(item) && (!isDragging || finalCampsiteId === (('campsite_id' in item ? item.campsite_id : null) || 'UNASSIGNED'))) return;

      if ('check_in' in item) {
        onReservationMoveRequested(item as Reservation, finalCampsiteId, finalStart, finalEnd);
      } else {
        onBlackoutMoveRequested(item as BlackoutDate, finalCampsiteId, finalStart, finalEnd);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearOperationState();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [isDragging, !!resizeState, updateScrollDirection, clearOperationState, onReservationMoveRequested, onBlackoutMoveRequested]);

  // Ghost Rendering Utility
  const getGhost = useCallback((resourceId: string): GhostState | null => {
    if (dragPreview && dragPreview.campsiteId === resourceId) {
      return buildGhostState('move', resourceId, dragPreview.startDate, dragPreview.endDate, validationError);
    }
    if (resizeState) {
      const itemResId = (('campsite_id' in resizeState.item ? resizeState.item.campsite_id : null) || 'UNASSIGNED');
      if (itemResId === resourceId) {
        return buildGhostState(resizeState.side === 'left' ? 'resize-start' : 'resize-end', resourceId, resizeState.newStartDate, resizeState.newEndDate, validationError);
      }
    }
    return null;
  }, [dragPreview, resizeState, validationError]);

  return {
    isDragging,
    draggedItem,
    dragPreview,
    resizeState,
    validationError,
    handleDragPointerDown,
    handleResizeStart,
    getGhost,
    getDragState: () => ({ draggedItem: draggedItemRef.current, dragPreview: dragPreviewRef.current, validationError: validationErrorRef.current }),
  };
}
