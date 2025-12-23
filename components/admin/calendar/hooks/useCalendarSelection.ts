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
  handleCellMouseDown: (campsiteId: string, dateStr: string) => void;

  /** Extend selection to a cell */
  handleCellMouseEnter: (campsiteId: string, dateStr: string) => void;

  /** Finish selection */
  handleCellMouseUp: () => void;

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
 *   handleCellMouseDown,
 *   handleCellMouseEnter,
 *   handleCellMouseUp,
 *   clearSelection
 * } = useCalendarSelection(true);
 *
 * <CalendarCell
 *   onMouseDown={() => handleCellMouseDown(campsiteId, dateStr)}
 *   onMouseEnter={() => handleCellMouseEnter(campsiteId, dateStr)}
 * />
 *
 * <div onMouseUp={handleCellMouseUp}>...</div>
 */
export function useCalendarSelection(enabled: boolean): UseCalendarSelectionReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState<{ campsiteId: string; date: string } | null>(null);
  const [creationEnd, setCreationEnd] = useState<{ campsiteId: string; date: string } | null>(null);

  // Use ref to keep handlers stable when enabled state changes
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const handleCellMouseDown = useCallback((campsiteId: string, dateStr: string) => {
    // Only start if selection is enabled
    if (!enabledRef.current) return;

    setIsCreating(true);
    setCreationStart({ campsiteId, date: dateStr });
    setCreationEnd({ campsiteId, date: dateStr });
  }, []); // Stable handler

  const handleCellMouseEnter = useCallback((campsiteId: string, dateStr: string) => {
    if (!isCreating || !creationStart) return;

    // Only allow selection within the same campsite
    if (campsiteId !== creationStart.campsiteId) return;

    setCreationEnd({ campsiteId, date: dateStr });
  }, [isCreating, creationStart]);

  const handleCellMouseUp = useCallback(() => {
    if (!isCreating) return;
    setIsCreating(false);
    // Don't clear creationStart/creationEnd here - parent needs them for dialog
  }, [isCreating]);

  const clearSelection = useCallback(() => {
    setIsCreating(false);
    setCreationStart(null);
    setCreationEnd(null);
  }, []);

  // Calculate normalized selection range (start <= end)
  const getSelectionRange = useCallback((): SelectionRange | null => {
    if (!creationStart || !creationEnd) return null;
    let start = creationStart.date;
    let end = creationEnd.date;
    if (start > end) [start, end] = [end, start];
    return { start, end, campsiteId: creationStart.campsiteId };
  }, [creationStart, creationEnd]);

  const selection = getSelectionRange();

  return {
    isCreating,
    creationStart,
    creationEnd,
    selection,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    clearSelection,
  };
}
