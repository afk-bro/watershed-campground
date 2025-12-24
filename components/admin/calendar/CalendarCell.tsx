/**
 * CalendarCell - Presentational component for individual calendar day cells
 *
 * Pure component that handles styling and events for a single calendar cell.
 * All logic is provided via props - this component only renders.
 */

import { format } from "date-fns";
import { memo } from "react";

interface CalendarCellProps {
  /** The date this cell represents */
  date: Date;

  /** Resource (campsite) ID or 'UNASSIGNED' */
  resourceId: string;

  /** Whether this is a weekend day */
  isWeekend: boolean;

  /** Whether this is today */
  isToday: boolean;

  /** Whether this cell is occupied (for availability mode) */
  isOccupied: boolean;

  /** Whether this cell is in the creation selection range */
  isInSelection: boolean;

  /** Whether this cell is being hovered during drag */
  isDragHovered: boolean;

  /** Whether to show availability coloring */
  showAvailability: boolean;

  /** Current validation error (if any) */
  validationError: string | null;

  /** Base background class (e.g., for unassigned row) */
  baseBackgroundClass?: string;

  /** Drag over handler */
  onDragOver: (resourceId: string, dateStr: string) => void;

  /** Drop handler */
  onDrop: (e: React.DragEvent, resourceId: string, dateStr: string) => void;

  /** Mouse down handler (start selection) */
  onMouseDown: (resourceId: string, dateStr: string) => void;

  /** Mouse enter handler (extend selection) */
  onMouseEnter: (resourceId: string, dateStr: string) => void;
}

function CalendarCell({
  date,
  resourceId,
  isWeekend,
  isToday,
  isOccupied,
  isInSelection,
  isDragHovered,
  showAvailability,
  validationError,
  baseBackgroundClass = "",
  onDragOver,
  onDrop,
  onMouseDown,
  onMouseEnter,
}: CalendarCellProps) {
  const dateStr = format(date, "yyyy-MM-dd");

  // Determine background styling based on state
  let bgClass = baseBackgroundClass;

  if (showAvailability) {
    // Availability mode: show green for available cells
    if (!isOccupied) {
      bgClass = "bg-[var(--color-success)]/10";
    }
    // Occupied cells have no special styling
  } else {
    // Normal mode: show weekend/today styling
    // Don't apply weekend styling if cell is in selection (to avoid conflict)
    if (!isInSelection && isWeekend) {
      bgClass = "bg-[var(--color-surface-elevated)]/30";
    }
    if (isToday) {
      bgClass = "bg-[var(--color-status-active)]/15";
    }
  }

  // Drag hover styling (overrides background)
  const dragHoverClass = isDragHovered
    ? validationError
      ? "bg-[var(--color-error)]/10 border-[var(--color-error)]"
      : "bg-[var(--color-success)]/10 border-[var(--color-success)]"
    : "";

  // Selection styling (overrides background)
  const selectionClass = isInSelection ? "bg-[var(--color-accent-gold)]/20" : "";

  return (
    <div
      data-date={dateStr}
      className={`w-8 lg:w-10 xl:w-12 h-10 lg:h-12 xl:h-14 flex-shrink-0 border-r border-[var(--color-border-subtle)] transition-surface ${bgClass} ${dragHoverClass} ${selectionClass}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(resourceId, dateStr);
      }}
      onDrop={(e) => {
        console.log('[CELL DROP]', { dateStr, resourceId }); 
        onDrop(e, resourceId, dateStr);
      }}
      onMouseDown={() => onMouseDown(resourceId, dateStr)}
      onMouseEnter={() => onMouseEnter(resourceId, dateStr)}
      title={`${format(date, 'EEEE, MMM d, yyyy')}`}
    />
  );
}

// Memoize to prevent unnecessary re-renders during drag operations
export default memo(CalendarCell, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return (
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.resourceId === nextProps.resourceId &&
    prevProps.isWeekend === nextProps.isWeekend &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.isOccupied === nextProps.isOccupied &&
    prevProps.isInSelection === nextProps.isInSelection &&
    prevProps.isDragHovered === nextProps.isDragHovered &&
    prevProps.showAvailability === nextProps.showAvailability &&
    prevProps.validationError === nextProps.validationError &&
    prevProps.baseBackgroundClass === nextProps.baseBackgroundClass
  );
});
