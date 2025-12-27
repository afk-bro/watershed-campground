"use client";

import { memo } from "react";
import { format, isToday, isWeekend } from "date-fns";
import { Campsite, Reservation, BlackoutDate } from "@/lib/supabase";
import CalendarCell from "./CalendarCell";
import ReservationBlock from "./ReservationBlock";
import BlackoutBlock from "./BlackoutBlock";
import GhostPreview from "./GhostPreview";
import { GhostState } from "@/lib/calendar/calendar-types";
import { ResizeSide } from "./BaseCalendarBlock";

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
  selectionCampsiteId?: string | null;
  selectionStart?: string | null;
  selectionEnd?: string | null;
  
  isDragging: boolean;
  dragPreview: { campsiteId: string; startDate: string } | null;
  draggedItemId?: string | null;
  resizeStateItemId?: string | null;
  showAvailability: boolean;
  validationError: string | null;

  // Handlers
  onCellPointerDown: (e: React.PointerEvent, resourceId: string, dateStr: string) => void;
  onCellPointerEnter: (resourceId: string, dateStr: string) => void;
  onReservationClick: (res: Reservation) => void;
  onBlackoutClick: (blackout: BlackoutDate) => void;
  onDragStart: (e: React.PointerEvent, item: any) => void;
  onResizeStart: (item: any, side: ResizeSide) => void;
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
  selectionCampsiteId,
  selectionStart,
  selectionEnd,
  isDragging,
  dragPreview,
  draggedItemId,
  resizeStateItemId,
  showAvailability,
  validationError,
  onCellPointerDown,
  onCellPointerEnter,
  onReservationClick,
  onBlackoutClick,
  onDragStart,
  onResizeStart,
  getGhost,
}: CalendarRowProps) {
  const resourceId = rowType === "unassigned" ? "UNASSIGNED" : (campsite?.id || "UNKNOWN");
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
    <div 
       data-campsite-id={resourceId}
       className={`flex border-b ${borderClass} ${rowHoverClass} ${rowBgClass} transition-surface group relative`}
    >
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
          const isOccupied = rowType === "campsite" && reservations.some(res =>
             dayStr >= res.check_in && dayStr < res.check_out
          );

          const isInSelection = !!(isCreating && selectionCampsiteId === resourceId && selectionStart && selectionEnd && dayStr >= selectionStart && dayStr <= selectionEnd);
          const isDragHovered = isDragging && dragPreview?.campsiteId === resourceId && dragPreview?.startDate === dayStr;

          return (
            <CalendarCell
              key={day.toString()}
              date={day}
              resourceId={resourceId}
              isWeekend={isWeekend(day)}
              isToday={isToday(day)}
              isOccupied={isOccupied || false}
              isInSelection={isInSelection}
              isDragHovered={isDragHovered}
              showAvailability={showAvailability}
              validationError={validationError}
              baseBackgroundClass={rowType === "unassigned" ? "bg-[var(--color-status-pending-bg)]/50" : ""}
              onPointerDown={onCellPointerDown}
              onPointerEnter={onCellPointerEnter}
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
            onResizeStart={onResizeStart}
            isDragging={draggedItemId === res.id}
            isResizing={resizeStateItemId === res.id}
            isGlobalDragging={isDragging}
          />
        ))}

        {/* Render Blackouts */}
        {blackoutDates.map((blackout) => (
          <BlackoutBlock
            key={blackout.id}
            blackout={blackout}
            monthStart={monthStart}
            monthEnd={monthEnd}
            onSelect={onBlackoutClick}
            onDragStart={onDragStart}
            onResizeStart={onResizeStart}
            isDragging={draggedItemId === blackout.id}
            isResizing={resizeStateItemId === blackout.id}
            isGlobalDragging={isDragging}
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
