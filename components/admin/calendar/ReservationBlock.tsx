"use client";

import { Reservation } from "@/lib/supabase";
import { format, differenceInDays, parseISO } from "date-fns";
import { AlertCircle, Tent, Truck } from "lucide-react";
import { memo } from "react";
import BaseCalendarBlock, { ResizeSide } from "./BaseCalendarBlock";

interface ReservationBlockProps {
  reservation: Reservation & { _saving?: boolean };
  monthStart: Date;
  monthEnd: Date;
  onSelect: (reservation: Reservation) => void;
  onDragStart: (e: React.PointerEvent, reservation: Reservation) => void;
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
  onResizeStart,
  isDragging = false,
  isResizing = false,
  isGlobalDragging = false,
}: ReservationBlockProps) {
  const checkIn = parseISO(reservation.check_in);
  const checkOut = parseISO(reservation.check_out);

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

  return (
    <BaseCalendarBlock
      startDate={checkIn}
      endDate={checkOut}
      monthStart={monthStart}
      monthEnd={monthEnd}
      isInteractive={isInteractive}
      statusColorClass={colorClass}
      isDragging={isDragging}
      isResizing={isResizing}
      isSaving={reservation._saving}
      isGlobalDragging={isGlobalDragging}
      onSelect={() => onSelect(reservation)}
      onDragStart={(e) => onDragStart(e, reservation)}
      onResizeStart={(side) => onResizeStart(reservation, side)}
      dataAttributes={{
        "data-reservation-id": reservation.id,
        "data-testid": "reservation-block",
        "data-start": reservation.check_in,
        "data-end": reservation.check_out,
        "data-campsite-id": reservation.campsite_id || 'UNASSIGNED',
      }}
      title={`${reservation.last_name}, ${reservation.first_name} [${reservation.id?.substring(0, 8) || 'No Ref'}]
Site: ${reservation.campsites?.name || 'Unassigned'}
Dates: ${format(checkIn, 'MMM d')} - ${format(checkOut, 'MMM d')} (${differenceInDays(checkOut, checkIn)} nights)
Status: ${reservation.status.toUpperCase()}
Unit: ${reservation.camping_unit || 'No equipment'}`}
      className={
        `${checkIn < monthStart ? 'rounded-l-none border-l-0' : 'rounded-l-lg'} ${
          checkOut > monthEnd ? 'rounded-r-none border-r-0' : 'rounded-r-lg'
        }`
      }
    >
      <div className="truncate flex-1 text-left pointer-events-none flex items-center gap-1">
        {getEquipmentIcon()}
        <span className="truncate">
          {reservation.last_name}, {reservation.first_name}
        </span>
      </div>
      {reservation.status === 'pending' && <AlertCircle size={12} className="pointer-events-none flex-shrink-0" />}
    </BaseCalendarBlock>
  );
}

export default memo(ReservationBlock, (prevProps, nextProps) => {
  return (
    prevProps.reservation.id === nextProps.reservation.id &&
    prevProps.reservation.check_in === nextProps.reservation.check_in &&
    prevProps.reservation.check_out === nextProps.reservation.check_out &&
    prevProps.reservation.status === nextProps.reservation.status &&
    prevProps.reservation.campsite_id === nextProps.reservation.campsite_id &&
    prevProps.reservation._saving === nextProps.reservation._saving &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isResizing === nextProps.isResizing &&
    prevProps.isGlobalDragging === nextProps.isGlobalDragging &&
    prevProps.monthStart.getTime() === nextProps.monthStart.getTime() &&
    prevProps.monthEnd.getTime() === nextProps.monthEnd.getTime()
  );
});
