/**
 * BlackoutBlock - Interactive blackout date block on calendar
 *
 * Similar to ReservationBlock but for blackout dates.
 * Supports drag to move and resize to adjust dates.
 */

import { BlackoutDate } from "@/lib/supabase";
import { format, differenceInDays, parseISO } from "date-fns";
import { Ban } from "lucide-react";
import { useState, memo } from "react";

type ResizeSide = "left" | "right";

interface BlackoutBlockProps {
  blackout: BlackoutDate & { _saving?: boolean };
  monthStart: Date;
  monthEnd: Date;
  onSelect: (blackout: BlackoutDate) => void;
  onDragStart: (e: React.DragEvent, blackout: BlackoutDate) => void;
  onDragEnd: () => void;
  onResizeStart: (blackout: BlackoutDate, side: ResizeSide) => void;
  isDragging?: boolean;
  isResizing?: boolean;
  isGlobalDragging?: boolean;
}

function BlackoutBlock({
  blackout,
  monthStart,
  monthEnd,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeStart,
  isDragging = false,
  isResizing = false,
  isGlobalDragging = false,
}: BlackoutBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const startDateObj = parseISO(blackout.start_date);
  const endDateObj = parseISO(blackout.end_date);

  // Calculate position and width relative to the month
  const startDate = startDateObj < monthStart ? monthStart : startDateObj;
  const endDate = endDateObj > monthEnd ? monthEnd : endDateObj;

  const offsetDays = differenceInDays(startDate, monthStart);
  let span = differenceInDays(endDate, startDate) + 1;
  if (span < 1) span = 1;

  const totalDays = differenceInDays(monthEnd, monthStart) + 1;
  const leftPercent = (offsetDays / totalDays) * 100;
  const widthPercent = (span / totalDays) * 100;

  // Blackout styling - red/warning theme
  const colorClass = "bg-red-500/10 text-red-600 border-red-500/30";

  // Blackouts are always interactive
  const isInteractive = true;

  const handleLeftResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isInteractive) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(blackout, "left");
    }
  };

  const handleRightResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isInteractive) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(blackout, "right");
    }
  };

  // Check if this blackout is being saved (optimistic update)
  const isSaving = blackout._saving;

  return (
    <div
      className={`absolute top-1 bottom-1 text-xs font-medium px-2 py-1 flex items-center gap-1.5 shadow-sm border-2 truncate transition-all hover:brightness-110 hover:shadow-md z-10 group ${colorClass} ${
        isDragging ? 'opacity-40' : ''
      } ${isResizing ? 'opacity-60' : ''} ${
        isSaving ? 'opacity-70' : ''
      } ${
        isGlobalDragging && !isDragging ? 'pointer-events-none' : ''
      } [.is-panning_&]:pointer-events-none ${
        startDateObj < monthStart ? 'rounded-l-none border-l-0' : 'rounded-l-lg'
      } ${
        endDateObj > monthEnd ? 'rounded-r-none border-r-0' : 'rounded-r-lg'
      }`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        cursor: isInteractive && !isResizing ? 'grab' : 'pointer',
      }}
      draggable={isInteractive && !isResizing}
      data-blackout-id={blackout.id}
      data-testid="blackout-block"
      data-start={blackout.start_date}
      data-end={blackout.end_date}
      data-campsite-id={blackout.campsite_id || 'ALL'}
      onDragStart={(e) => {
        if (isResizing || !isInteractive) {
          e.preventDefault();
          return;
        }
        // Hide the default browser drag image so we only see the customized GhostPreview
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);

        onDragStart(e, blackout);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(blackout)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${blackout.reason || "Maintenance / Block"}
Dates: ${format(startDateObj, 'MMM d')} - ${format(endDateObj, 'MMM d')} (${differenceInDays(endDateObj, startDateObj) + 1} days)
Type: BLACKOUT`}
    >
      {/* Left Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-red-500/50 rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-red-500 transition-surface z-20"
          onPointerDown={handleLeftResizeStart}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Content */}
      <div className="truncate flex-1 text-left pointer-events-none flex items-center gap-1.5 justify-center">
        <Ban className="flex-shrink-0 w-3.5 h-3.5 opacity-70" />
        <span className="truncate uppercase tracking-wide font-semibold">
          {blackout.reason || "Unavailable"}
        </span>
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap shadow-md z-30 pointer-events-none">
          Saving...
        </span>
      )}

      {/* Right Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-red-500/50 rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-red-500 transition-surface z-20"
          onPointerDown={handleRightResizeStart}
          style={{ touchAction: 'none' }}
        />
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders during drag operations
export default memo(BlackoutBlock, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return (
    prevProps.blackout.id === nextProps.blackout.id &&
    prevProps.blackout.start_date === nextProps.blackout.start_date &&
    prevProps.blackout.end_date === nextProps.blackout.end_date &&
    prevProps.blackout.reason === nextProps.blackout.reason &&
    prevProps.blackout.campsite_id === nextProps.blackout.campsite_id &&
    prevProps.blackout._saving === nextProps.blackout._saving &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isResizing === nextProps.isResizing &&
    prevProps.isGlobalDragging === nextProps.isGlobalDragging &&
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.monthEnd.getTime() === nextProps.monthEnd.getTime()
  );
});
