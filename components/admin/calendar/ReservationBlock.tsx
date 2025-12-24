
import { Reservation } from "@/lib/supabase";
import { format, differenceInDays, parseISO } from "date-fns";
import { User, Tent, Home, AlertCircle, Truck } from "lucide-react";
import { useState, memo } from "react";

type ResizeSide = "left" | "right";

interface ReservationBlockProps {
  reservation: Reservation;
  monthStart: Date;
  monthEnd: Date;
  onSelect: (reservation: Reservation) => void;
  onDragStart: (e: React.DragEvent, reservation: Reservation) => void;
  onDragEnd: () => void;
  onResizeStart: (reservation: Reservation, side: ResizeSide) => void;
  isDragging?: boolean;
  isResizing?: boolean;
  isGlobalDragging?: boolean;
}

function ReservationBlock({
  reservation,
  monthStart,
  monthEnd,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeStart,
  isDragging = false,
  isResizing = false,
  isGlobalDragging = false,
}: ReservationBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const checkIn = parseISO(reservation.check_in);
  const checkOut = parseISO(reservation.check_out);

  // Calculate position and width relative to the month
  const startDate = checkIn < monthStart ? monthStart : checkIn;
  const endDate = checkOut > monthEnd ? monthEnd : checkOut;

  const offsetDays = differenceInDays(startDate, monthStart);
  let span = differenceInDays(endDate, startDate) + 1;
  if (span < 1) span = 1;

  const totalDays = differenceInDays(monthEnd, monthStart) + 1;
  const leftPercent = (offsetDays / totalDays) * 100;
  const widthPercent = (span / totalDays) * 100;

  // Status colors
  const statusColors = {
    confirmed: "bg-[var(--color-status-active)] text-white border-[var(--color-status-active)]",
    pending: "bg-[var(--color-status-pending)] text-[var(--color-text-inverse)] border-[var(--color-status-pending)]",
    checked_in: "bg-[var(--color-status-confirmed)] text-white border-[var(--color-status-confirmed)]",
    checked_out: "bg-[var(--color-status-neutral)] text-white border-[var(--color-status-neutral)]",
    cancelled: "bg-[var(--color-status-cancelled)]/30 text-[var(--color-text-primary)] border-[var(--color-status-cancelled)] opacity-50",
    no_show: "bg-[var(--color-status-cancelled)] text-white border-[var(--color-status-cancelled)]",
  };

  const colorClass = statusColors[reservation.status] || "bg-gray-400 text-white";

  // Non-draggable/resizable statuses
  const isInteractive = reservation.status !== 'cancelled' && reservation.status !== 'no_show' && reservation.status !== 'checked_out';

  // Get equipment icon based on camping unit
  const getEquipmentIcon = () => {
    const unit = reservation.camping_unit?.toLowerCase() || '';
    if (unit.includes('tent')) {
      return <Tent size={12} className="flex-shrink-0 opacity-80" />;
    } else if (unit.includes('rv') || unit.includes('trailer') || unit.includes('motorhome') || unit.includes('camper')) {
      return <Truck size={12} className="flex-shrink-0 opacity-80" />;
    }
    return null;
  };

  const handleLeftResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    e.preventDefault(); // Prevent default behavior
    if (isInteractive) {
      // Capture pointer to ensure we get all move events
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(reservation, "left");
    }
  };

  const handleRightResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    e.preventDefault(); // Prevent default behavior
    if (isInteractive) {
      // Capture pointer to ensure we get all move events
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(reservation, "right");
    }
  };

  return (
    <div
      className={`absolute top-1 bottom-1 text-xs font-medium px-2 py-1 flex items-center gap-1 shadow-sm border truncate transition-all hover:brightness-110 hover:shadow-md z-10 group ${colorClass} ${
        isDragging ? 'opacity-40' : ''
      } ${isResizing ? 'opacity-60' : ''} ${
        isGlobalDragging && !isDragging ? 'pointer-events-none' : ''
      } [.is-panning_&]:pointer-events-none ${
        checkIn < monthStart ? 'rounded-l-none border-l-0' : 'rounded-l-lg'
      } ${
        checkOut > monthEnd ? 'rounded-r-none border-r-0' : 'rounded-r-lg'
      }`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        cursor: isInteractive && !isResizing ? 'grab' : 'pointer',
      }}
      draggable={isInteractive && !isResizing}
      data-reservation-id={reservation.id}
      data-testid={`reservation-block-${reservation.id}`}
      onDragStart={(e) => {
        // Don't allow drag to start if we're resizing or hovering over handles
        if (isResizing || !isInteractive) {
          e.preventDefault();
          return;
        }
        onDragStart(e, reservation);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(reservation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${reservation.last_name}, ${reservation.first_name} [${reservation.id?.substring(0, 8) || 'No Ref'}]
Site: ${reservation.campsites?.name || 'Unassigned'}
Dates: ${format(checkIn, 'MMM d')} - ${format(checkOut, 'MMM d')} (${differenceInDays(checkOut, checkIn)} nights)
Status: ${reservation.status.toUpperCase()}
Unit: ${reservation.camping_unit || 'No equipment'}`}
    >
      {/* Left Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-[var(--color-border-strong)] rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] transition-surface z-20"
          onPointerDown={handleLeftResizeStart}
          style={{ touchAction: 'none' }}
          data-testid="resize-handle-left"
        />
      )}

      {/* Content */}
      <div className="truncate flex-1 text-left pointer-events-none flex items-center gap-1">
        {getEquipmentIcon()}
        <span className="truncate">
          {reservation.last_name}, {reservation.first_name}
        </span>
      </div>
      {reservation.status === 'pending' && <AlertCircle size={12} className="pointer-events-none flex-shrink-0" />}

      {/* Right Resize Handle */}
      {isInteractive && (isHovered || isResizing) && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-8 bg-[var(--color-surface-card)]/80 border border-[var(--color-border-strong)] rounded-full cursor-ew-resize hover:bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] transition-surface z-20"
          onPointerDown={handleRightResizeStart}
          style={{ touchAction: 'none' }}
          data-testid="resize-handle-right"
        />
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders during drag operations
export default memo(ReservationBlock, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return (
    prevProps.reservation.id === nextProps.reservation.id &&
    prevProps.reservation.check_in === nextProps.reservation.check_in &&
    prevProps.reservation.check_out === nextProps.reservation.check_out &&
    prevProps.reservation.status === nextProps.reservation.status &&
    prevProps.reservation.campsite_id === nextProps.reservation.campsite_id &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isResizing === nextProps.isResizing &&
    prevProps.isGlobalDragging === nextProps.isGlobalDragging &&
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.monthEnd.getTime() === nextProps.monthEnd.getTime()
  );
});
