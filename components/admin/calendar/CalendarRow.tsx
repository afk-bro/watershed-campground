"use client";

import { memo } from "react";
import { format, isToday, isWeekend } from "date-fns";
import { Campsite, Reservation, BlackoutDate } from "@/lib/supabase";
import CalendarCell from "./CalendarCell";
import ReservationBlock from "./ReservationBlock";
import BlackoutBlock from "./BlackoutBlock";
import GhostPreview from "./GhostPreview";
import { GhostState } from "@/lib/calendar/calendar-types";
import { type DragResizeItem, type ResizeState } from "./hooks/useDragResize";
import { type SelectionRange } from "./hooks/useCalendarSelection";

interface CalendarRowProps {
  // Data
  rowType: "unassigned" | "campsite";
  campsite?: Campsite; // Required if rowType is 'campsite'
  reservations: Reservation[]; // Already filtered for this row
  blackoutDates: BlackoutDate[]; // Already filtered for this row
  days: Date[];
  monthStart: Date;
  monthEnd: Date;
  totalDays: number;

  // Interaction State
  isCreating: boolean;
  selection: SelectionRange | null;
  isDragging: boolean;
  dragPreview: unknown; // Using unknown for DragPreview to avoid circular deps or complex imports, can define proper type if needed
  draggedItem: DragResizeItem | null;
  resizeState: ResizeState | null;
  showAvailability: boolean;
  validationError: string | null;

  // Handlers
  onDragOver: (resourceId: string, dateStr: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onCellMouseDown: (resourceId: string, dateStr: string) => void;
  onCellMouseEnter: (resourceId: string, dateStr: string) => void;
  onReservationClick: (res: Reservation) => void;
  onBlackoutClick: (blackout: BlackoutDate) => void;
  onDragStart: (e: React.DragEvent, item: DragResizeItem) => void;
  onDragEnd: () => void;
  onResizeStart: (item: DragResizeItem, side: "left" | "right") => void;
  getGhost: (resourceId: string) => GhostState | null;
}

function CalendarRow({
  rowType,
  campsite,
  reservations,
  blackoutDates,
  days,
  monthStart,
  monthEnd,
  totalDays,
  isCreating,
  selection,
  isDragging,
  dragPreview,
  draggedItem,
  resizeState,
  showAvailability,
  validationError,
  onDragOver,
  onDrop,
  onCellMouseDown,
  onCellMouseEnter,
  onReservationClick,
  onBlackoutClick,
  onDragStart,
  onDragEnd,
  onResizeStart,
  getGhost,
}: CalendarRowProps) {
  const resourceId = rowType === "unassigned" ? "UNASSIGNED" : campsite!.id;
  const isInactive = rowType === "campsite" && !campsite?.is_active;

  // Styling
  let rowBgClass = "";
  let rowHoverClass = "hover:bg-[var(--color-surface-elevated)]/50";
  let stickyBgClass = "bg-[var(--color-surface-card)] group-hover:bg-[var(--color-surface-elevated)]";

  if (rowType === "unassigned") {
    rowBgClass = "bg-[var(--color-status-pending-bg)]";
    rowHoverClass = "hover:bg-[var(--color-status-pending-bg)]/70";
    stickyBgClass = "bg-[var(--color-status-pending-bg)] group-hover:bg-[var(--color-status-pending-bg)]/70";
  } else if (isInactive) {
    rowBgClass = "bg-[var(--color-error)]/10";
    rowHoverClass = "hover:bg-[var(--color-error)]/15";
    stickyBgClass = "bg-[var(--color-error)]/10 group-hover:bg-[var(--color-error)]/15";
  }

  const borderClass = isInactive ? "border-[var(--color-error)]/30" : "border-[var(--color-border-subtle)]";
  
  return (
    <div className={`flex border-b ${borderClass} ${rowHoverClass} ${rowBgClass} transition-surface group relative`}>
      {/* Sticky Column */}
      <div className={`sticky left-0 w-32 sm:w-48 lg:w-64 ${stickyBgClass} transition-surface border-r border-[var(--color-border-default)] p-2 lg:p-3 flex items-center justify-between shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-20 ${isInactive ? 'border-r-[var(--color-error)]/30' : ''}`}>
        <div className="min-w-0 flex-1">
          {rowType === "unassigned" ? (
            <>
              <div className="font-medium text-[var(--color-text-primary)] text-xs lg:text-sm truncate">Unassigned</div>
              <div className="text-[10px] lg:text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-[var(--color-text-primary)] text-xs lg:text-sm truncate">{campsite!.name}</div>
              <div className="text-[10px] lg:text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <span className="uppercase">{campsite!.type}</span> • {campsite!.max_guests} Guests
              </div>
            </>
          )}
        </div>
        
        {rowType === "unassigned" ? (
          <div className="w-2 h-2 rounded-full bg-[var(--color-status-pending)] flex-shrink-0" title="Needs Assignment" />
        ) : (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: campsite!.is_active ? 'var(--color-success)' : 'var(--color-status-neutral)' }} title={campsite!.is_active ? 'Active' : 'Inactive'} />
        )}
      </div>

      {/* Day Cells */}
      <div className="flex relative">
        {days.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          // Check if day is occupied
          // For Unassigned: always false (availability doesn't apply)
          // For Campsite: check reservation overlap
          const isOccupied = rowType === "campsite" && reservations.some(res =>
             dayStr >= res.check_in && dayStr < res.check_out
          );

          const isInSelection = isCreating && selection?.campsiteId === resourceId && dayStr >= selection.start && dayStr <= selection.end;
          const hasDragPreview = (p: unknown): p is { campsiteId: string; startDate: string } => {
            if (!p || typeof p !== 'object') return false;
            const o = p as Record<string, unknown>;
            return typeof o.campsiteId === 'string' && typeof o.startDate === 'string';
          };
          const isDragHovered = isDragging && hasDragPreview(dragPreview) && dragPreview.campsiteId === resourceId && dragPreview.startDate === dayStr;

          return (
            <CalendarCell
              key={day.toString()}
              date={day}
              resourceId={resourceId}
              isWeekend={isWeekend(day)}
              isToday={isToday(day)}
              // Unassigned rows shouldn't appear occupied in "Show Availability" mode 
              // because they aren't real capacity, but let's stick to existing logic:
              // existing logic: unassigned row pass isOccupied=false always
              isOccupied={isOccupied || false}
              isInSelection={isInSelection}
              isDragHovered={isDragHovered}
              showAvailability={showAvailability}
              validationError={validationError}
              // Unassigned row passed custom baseBackgroundClass
              baseBackgroundClass={rowType === "unassigned" ? "bg-[var(--color-status-pending-bg)]/50" : ""}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onMouseDown={onCellMouseDown}
              onMouseEnter={onCellMouseEnter}
            />
          );
        })}

        {/* Render Reservations */}
        {reservations.map((res) => (
          <ReservationBlock
            key={res.id}
            reservation={res}
            monthStart={monthStart}
            monthEnd={monthEnd}
            onSelect={onReservationClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onResizeStart={onResizeStart}
            isDragging={draggedItem?.id === res.id}
            isResizing={resizeState?.item.id === res.id}
          />
        ))}

        {/* Render Blackouts (only for campsites usually, but type allows for unassigned technically) */}
        {blackoutDates.map((blackout) => (
          <BlackoutBlock
            key={blackout.id}
            blackout={blackout}
            monthStart={monthStart}
            monthEnd={monthEnd}
            onSelect={onBlackoutClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onResizeStart={onResizeStart}
            isDragging={draggedItem?.id === blackout.id}
            isResizing={resizeState?.item.id === blackout.id}
          />
        ))}

        {/* Unified Ghost Preview */}
        <GhostPreview
          ghost={getGhost(resourceId)}
          monthStart={monthStart}
          monthEnd={monthEnd}
          totalDays={totalDays}
          label={rowType === "unassigned" ? "Unassigned" : campsite!.code}
        />
      </div>
    </div>
  );
}

export default memo(CalendarRow);
