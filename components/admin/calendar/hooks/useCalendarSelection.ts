/**
 * useCalendarSelection - Custom hook for calendar creation selection
 *
 * Handles mouse-based selection for creating reservations and blackout dates.
 * User clicks and drags across calendar cells to select a date range.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface SelectionRange {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  campsiteId: string;
}

export interface UseCalendarSelectionReturn {
  /** Whether user is currently selecting */
  isCreating: boolean;

  /** Start of selection (campsite + date) */
  creationStart: { campsiteId: string; date: string } | null;

  /** End of selection (campsite + date) */
  creationEnd: { campsiteId: string; date: string } | null;

  /** Normalized selection range (start <= end) */
  selection: SelectionRange | null;

  /** Start selection on a cell */
  handleCellPointerDown: (e: React.PointerEvent, campsiteId: string, dateStr: string) => void;

  /** Extend selection to a cell */
  handleCellPointerEnter: (campsiteId: string, dateStr: string) => void;

  /** Finish selection */
  handleCellPointerUp: () => void;

  /** Cancel selection (for pointercancel events) */
  handleCellPointerCancel: () => void;

  /** Cancel/clear selection */
  clearSelection: () => void;
}

/**
 * Hook for managing calendar cell selection during creation
 *
 * @param enabled - Whether selection is enabled (disabled during drag/resize)
 * @returns Object with selection state and handlers
 *
 * @example
 * const {
 *   isCreating,
 *   selection,
 *   handleCellPointerDown,
 *   handleCellPointerEnter,
 *   handleCellPointerUp,
 *   handleCellPointerCancel,
 *   clearSelection
 * } = useCalendarSelection(true);
 *
 * <CalendarCell
 *   onPointerDown={(e) => handleCellPointerDown(e, campsiteId, dateStr)}
 *   onPointerEnter={() => handleCellPointerEnter(campsiteId, dateStr)}
 * />
 *
 * <div onPointerUp={handleCellPointerUp} onPointerCancel={handleCellPointerCancel}>...</div>
 */
export function useCalendarSelection(
  enabled: boolean,
  isValidSelection?: (campsiteId: string, dateStr: string) => boolean
): UseCalendarSelectionReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState<{ campsiteId: string; date: string } | null>(null);
  const [creationEnd, setCreationEnd] = useState<{ campsiteId: string; date: string } | null>(null);

  // Anchor ref - holds the initial cell that started the selection
  // This should NEVER flip during a selection session
  const anchorRef = useRef<{ campsiteId: string; date: string } | null>(null);

  // Active ref - holds the current hover cell
  const activeRef = useRef<{ campsiteId: string; date: string } | null>(null);

  // Refs to keep handlers stable and avoid stale closures without frequent re-renders
  const stateRef = useRef({
    isCreating,
    creationStart,
    creationEnd,
    enabled
  });

  useEffect(() => {
    stateRef.current = { isCreating, creationStart, creationEnd, enabled };
  }, [isCreating, creationStart, creationEnd, enabled]);

  const handleCellPointerDown = useCallback((e: React.PointerEvent, campsiteId: string, dateStr: string) => {
    const { isCreating, creationStart, enabled } = stateRef.current;

    // Only handle left button (primary pointer button)
    if (e.button !== 0) return;
    if (!enabled) return;

    // Prevent text selection and default browser behavior
    e.preventDefault();

    // Capture pointer to ensure we get all pointer events even if cursor leaves element
    e.currentTarget.setPointerCapture(e.pointerId);

    // Check if cell is occupied immediately on click
    if (isValidSelection && !isValidSelection(campsiteId, dateStr)) {
      return;
    }

    // If already creating, this click is the "End" click
    if (isCreating && creationStart && campsiteId === creationStart.campsiteId) {
      setIsCreating(false);
      setCreationEnd({ campsiteId, date: dateStr });
      activeRef.current = { campsiteId, date: dateStr };
      return;
    }

    // Otherwise, this is the "Start" click - set the anchor
    anchorRef.current = { campsiteId, date: dateStr };
    activeRef.current = { campsiteId, date: dateStr };
    setIsCreating(true);
    setCreationStart({ campsiteId, date: dateStr });
    setCreationEnd({ campsiteId, date: dateStr });
  }, [isValidSelection]); // Dependencies reduced to just the validator

  const handleCellPointerEnter = useCallback((campsiteId: string, dateStr: string) => {
    const { isCreating, creationStart } = stateRef.current;

    if (!isCreating || !creationStart) return;

    // Prevent dragging over occupied cells
    if (isValidSelection && !isValidSelection(campsiteId, dateStr)) {
      return;
    }

    // Update active end only
    activeRef.current = { campsiteId, date: dateStr };
    setCreationEnd({ campsiteId, date: dateStr });
  }, [isValidSelection]);

  const clearSelection = useCallback(() => {
    setIsCreating(false);
    setCreationStart(null);
    setCreationEnd(null);
    anchorRef.current = null;
    activeRef.current = null;
  }, []);

  const handleCellPointerUp = useCallback(() => {
    const { isCreating, creationStart, creationEnd } = stateRef.current;

    if (!isCreating || !creationStart || !creationEnd) return;

    if (creationStart.date !== creationEnd.date) {
      setIsCreating(false);
    }
  }, []);

  const handleCellPointerCancel = useCallback(() => {
    // Handle OS gestures, tab switches, or other interruptions
    clearSelection();
  }, [clearSelection]);

  // Calculate normalized selection range (start <= end)
  const getSelectionRange = useCallback((): SelectionRange | null => {
    if (!creationStart || !creationEnd) return null;
    let start = creationStart.date;
    let end = creationEnd.date;
    if (start > end) [start, end] = [end, start];
    return { start, end, campsiteId: creationStart.campsiteId };
  }, [creationStart, creationEnd]);

  const selection = getSelectionRange();

  // Dev-only invariant check: anchor should never flip
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if (anchorRef.current && selection?.start) {
        const anchor = anchorRef.current.date;
        // Anchor must always be either start or end of selection range
        const ok = selection.start === anchor || selection.end === anchor;
        if (!ok) {
          console.error("[INVARIANT] anchor flipped", {
            anchor,
            selection,
            anchorRef: anchorRef.current,
            activeRef: activeRef.current,
          });
        }
      }
    }
  }, [selection]);

  // Handle escape to clear
  useEffect(() => {
    // We can allow this to be reactive to state since it's just attaching a listener
    if (!isCreating) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isCreating, clearSelection]);

  // Handle window blur to cancel selection (user switches tabs/apps)
  useEffect(() => {
    if (!isCreating) return;
    const handleBlur = () => {
      clearSelection();
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isCreating, clearSelection]);

  return {
    isCreating,
    creationStart,
    creationEnd,
    selection,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerUp,
    handleCellPointerCancel,
    clearSelection,
  };
}
