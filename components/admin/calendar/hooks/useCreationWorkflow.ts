import { useState, useEffect, useRef, useCallback } from 'react';
import { useCalendarSelection } from './useCalendarSelection';
import type { BlackoutDate, Reservation } from '@/lib/supabase';
import { handleAdminError } from '@/lib/admin/error-handler';
import { useToast } from '@/components/ui/Toast';

export interface UseCreationWorkflowParams {
  /** Whether drag or resize is currently active (blocks creation) */
  isDragging: boolean;
  /** Current resize state */
  resizeState: unknown;
  /** Reservations for validation */
  reservations: Reservation[];
  /** Blackout dates for validation */
  blackoutDates: BlackoutDate[];
  /** Scroll update function from useAutoScroll */
  updateScrollDirection: (clientX: number, clientY: number) => void;
  /** Stop scroll function from useAutoScroll */
  stopAutoScroll: () => void;
  /** Blackout creation function */
  createBlackout: (startDate: string, endDate: string, campsiteId: string, reason: string) => Promise<void>;
}

export interface UseCreationWorkflowReturn {
  // Selection State
  isCreating: boolean;
  selection: {
    start: string;
    end: string;
    campsiteId: string;
  } | null;
  creationStart: { date: string; campsiteId: string } | null;
  creationEnd: { date: string; campsiteId: string } | null;

  // Dialog State (derived from selection)
  showCreationDialog: boolean;

  // Handlers
  handleCellPointerDown: (e: React.PointerEvent, campsiteId: string, dateStr: string) => void;
  handleCellPointerEnter: (campsiteId: string, dateStr: string) => void;
  handleCellPointerUp: () => void;
  handleCellPointerCancel: () => void;
  handleCreateBlackout: (reason: string) => Promise<void>;
  clearSelection: () => void;
}

/**
 * useCreationWorkflow
 *
 * Manages the complete blackout creation workflow:
 * - Selection via pointer events
 * - Auto-scroll during creation drag
 * - Creation dialog display
 * - Blackout creation submission
 *
 * Encapsulates complex multi-phase interaction with stale closure handling.
 *
 * @param params - Drag state, validation data, and mutation functions
 * @returns Selection state, dialog state, and event handlers
 */
export function useCreationWorkflow({
  isDragging,
  resizeState,
  reservations,
  blackoutDates,
  updateScrollDirection,
  stopAutoScroll,
  createBlackout
}: UseCreationWorkflowParams): UseCreationWorkflowReturn {
  const { showToast } = useToast();

  // Validation: check if a cell is available for blackout creation
  const isValidSelectionCell = useCallback((campsiteId: string, dateStr: string) => {
    // Unassigned row cannot have blackouts
    if (campsiteId === 'UNASSIGNED') return false;

    // Check if cell is occupied by reservation
    const isOccupiedByReservation = reservations.some(res =>
      res.campsite_id === campsiteId && dateStr >= res.check_in && dateStr < res.check_out && res.status !== 'cancelled'
    );
    // Check if cell is occupied by blackout
    const isOccupiedByBlackout = blackoutDates.some(b =>
      (b.campsite_id === campsiteId || b.campsite_id === null) && dateStr >= b.start_date && dateStr <= b.end_date
    );
    return !isOccupiedByReservation && !isOccupiedByBlackout;
  }, [reservations, blackoutDates]);

  // Calendar selection hook (disabled when drag or resize is active)
  const {
    isCreating,
    creationStart,
    creationEnd,
    selection,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerUp: handleCellPointerUpBase,
    handleCellPointerCancel,
    clearSelection,
  } = useCalendarSelection(!isDragging && !resizeState, isValidSelectionCell);

  // Wrap handleCellPointerUp for consistency
  const handleCellPointerUp = useCallback(() => {
    handleCellPointerUpBase();
  }, [handleCellPointerUpBase]);

  // Derive dialog state: show when selection is finalized (not creating and has selection)
  const showCreationDialog = !isCreating && !!selection && !!creationStart && !!creationEnd;

  // Ref to track if we're currently creating (prevents stale closures)
  const isCreatingRef = useRef(isCreating);
  useEffect(() => {
    isCreatingRef.current = isCreating;
  }, [isCreating]);

  // Auto-scroll during creation drag - stabilized handler using refs
  // This function is created once and never recreates, preventing listener thrash
  const handleCreationPointerMove = useCallback((e: PointerEvent) => {
    // Read current state from ref to avoid stale closures
    if (!isCreatingRef.current) return;
    updateScrollDirection(e.clientX, e.clientY);
  }, [updateScrollDirection]); // Only depends on updateScrollDirection, not isCreating

  // Add/remove window pointer listeners for creation drag
  // Attaches ONCE when isCreating becomes true, removes when it becomes false
  useEffect(() => {
    if (isCreating) {
      console.log('[CREATION] Setting up pointermove listener for auto-scroll');
      window.addEventListener('pointermove', handleCreationPointerMove);
      return () => {
        console.log('[CREATION] Removing pointermove listener');
        window.removeEventListener('pointermove', handleCreationPointerMove);
        stopAutoScroll(); // Stop any active scrolling
      };
    }
    return undefined;
  }, [isCreating, handleCreationPointerMove, stopAutoScroll]);

  // Handle blackout creation submission
  const handleCreateBlackout = useCallback(async (reason: string) => {
    if (!creationStart || !creationEnd) return;

    // Check if we have a valid campsite ID
    if (!creationStart.campsiteId || creationStart.campsiteId === 'UNASSIGNED') {
      showToast('Cannot create blackout on Unassigned row', 'error');
      return;
    }

    try {
      await createBlackout(creationStart.date, creationEnd.date, creationStart.campsiteId, reason);
    } catch (error: unknown) {
      // Error already logged and toasted by the hook
      handleAdminError(error, 'useCreationWorkflow.createBlackout');
    }
  }, [creationStart, creationEnd, createBlackout, showToast]);

  return {
    // Selection State
    isCreating,
    selection,
    creationStart,
    creationEnd,

    // Dialog State (derived)
    showCreationDialog,

    // Handlers
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerUp,
    handleCellPointerCancel,
    handleCreateBlackout,
    clearSelection
  };
}
