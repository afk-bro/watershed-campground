"use client";

import { BlackoutDate } from "@/lib/supabase";
import { format, differenceInDays, parseISO } from "date-fns";
import { Ban } from "lucide-react";
import { memo } from "react";
import BaseCalendarBlock, { ResizeSide } from "./BaseCalendarBlock";

interface BlackoutBlockProps {
  blackout: BlackoutDate & { _saving?: boolean };
  monthStart: Date;
  monthEnd: Date;
  onSelect: (blackout: BlackoutDate) => void;
  onDragStart: (e: React.PointerEvent, blackout: BlackoutDate) => void;
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
  onResizeStart,
  isDragging = false,
  isResizing = false,
  isGlobalDragging = false,
}: BlackoutBlockProps) {
  const startDateObj = parseISO(blackout.start_date);
  const endDateObj = parseISO(blackout.end_date);

  // Blackout styling - red/warning theme
  const colorClass = "bg-red-500/10 text-red-600 border-red-500/30";

  // Blackouts are always interactive
  const isInteractive = true;

  return (
    <BaseCalendarBlock
      startDate={startDateObj}
      endDate={endDateObj}
      monthStart={monthStart}
      monthEnd={monthEnd}
      isInteractive={isInteractive}
      statusColorClass={colorClass}
      isDragging={isDragging}
      isResizing={isResizing}
      isSaving={blackout._saving}
      isGlobalDragging={isGlobalDragging}
      onSelect={() => onSelect(blackout)}
      onDragStart={(e) => onDragStart(e, blackout)}
      onResizeStart={(side) => onResizeStart(blackout, side)}
      dataAttributes={{
        "data-blackout-id": blackout.id,
        "data-testid": "blackout-block",
        "data-start": blackout.start_date,
        "data-end": blackout.end_date,
        "data-campsite-id": blackout.campsite_id || 'ALL',
      }}
      title={`${blackout.reason || "Maintenance / Block"}
Dates: ${format(startDateObj, 'MMM d')} - ${format(endDateObj, 'MMM d')} (${differenceInDays(endDateObj, startDateObj) + 1} days)
Type: BLACKOUT`}
      className={`${startDateObj < monthStart ? 'rounded-l-none border-l-0' : 'rounded-l-lg'} ${
        endDateObj > monthEnd ? 'rounded-r-none border-r-0' : 'rounded-r-lg'
      } border-2`}
    >
      <div className="truncate flex-1 text-left pointer-events-none flex items-center gap-1.5 justify-center">
        <Ban className="flex-shrink-0 w-3.5 h-3.5 opacity-70" />
        <span className="truncate uppercase tracking-wide font-semibold">
          {blackout.reason || "Unavailable"}
        </span>
      </div>
    </BaseCalendarBlock>
  );
}

export default memo(BlackoutBlock, (prevProps, nextProps) => {
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
