"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Campsite, Reservation } from "@/lib/supabase";
import { format, eachDayOfInterval, isSameMonth, isToday, isWeekend, startOfMonth, endOfMonth, parseISO, differenceInDays, addDays } from "date-fns";
import ReservationBlock from "./ReservationBlock";
import ReservationDrawer from "./ReservationDrawer";
import RescheduleConfirmDialog from "./RescheduleConfirmDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface CalendarGridProps {
  campsites: Campsite[];
  reservations: Reservation[];
  date: Date; // The month we are viewing
  onDateChange: (date: Date) => void;
}

export default function CalendarGrid({
  campsites,
  reservations,
  date,
  onDateChange,
}: CalendarGridProps) {
  const { showToast } = useToast();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    campsiteId: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    reservation: Reservation;
    newCampsiteId: string;
    newStartDate: string;
    newEndDate: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resize state (using pointer events, not HTML5 DnD)
  type ResizeSide = "left" | "right";
  const [resizeState, setResizeState] = useState<{
    reservation: Reservation;
    side: ResizeSide;
    originalCheckIn: string;
    originalCheckOut: string;
    newCheckIn: string;
    newCheckOut: string;
  } | null>(null);

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleReservationClick = (res: Reservation) => {
    setSelectedReservation(res);
    setIsDrawerOpen(true);
  };

  // Helper: Check if date is within current month range
  const isDateInMonthRange = (dateStr: string): boolean => {
    const date = parseISO(dateStr);
    return date >= monthStart && date <= monthEnd;
  };

  // Helper: Calculate new end date preserving duration
  const calculateNewEndDate = (oldCheckIn: string, oldCheckOut: string, newCheckIn: string): string => {
    const durationNights = differenceInDays(parseISO(oldCheckOut), parseISO(oldCheckIn));
    const newCheckOut = addDays(parseISO(newCheckIn), durationNights);
    return format(newCheckOut, 'yyyy-MM-dd');
  };

  // Helper: Sync validation (no async)
  const validateMoveLocal = (
    reservation: Reservation,
    targetCampsiteId: string,
    targetCheckIn: string,
    targetCheckOut: string
  ): { valid: boolean; error: string | null } => {
    // Special case: Moving to Unassigned is always valid
    if (targetCampsiteId === 'UNASSIGNED') {
      return { valid: true, error: null };
    }

    // Check if campsite is active
    const targetCampsite = campsites.find(c => c.id === targetCampsiteId);
    if (!targetCampsite) {
      return { valid: false, error: 'Campsite not found' };
    }
    if (!targetCampsite.is_active) {
      return { valid: false, error: 'Campsite is inactive' };
    }

    // Check for overlaps using already-loaded reservations
    const conflicts = reservations.filter(r => {
      if (r.id === reservation.id) return false; // Exclude current reservation
      if (r.campsite_id !== targetCampsiteId) return false;
      if (r.status === 'cancelled' || r.status === 'no_show') return false;

      // Overlap check: a.start < b.end && a.end > b.start
      return r.check_in < targetCheckOut && r.check_out > targetCheckIn;
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return {
        valid: false,
        error: `Conflicts with ${conflict.first_name} ${conflict.last_name} reservation`
      };
    }

    return { valid: true, error: null };
  };

  const handlePrevMonth = () => {
    onDateChange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent, reservation: Reservation) => {
    setIsDragging(true);
    setDraggedReservation(reservation);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCell = (campsiteId: string, dateStr: string) => {
    if (!draggedReservation) return;

    // Check if date is out of current month range
    if (!isDateInMonthRange(dateStr)) {
      setDragPreview({ campsiteId, startDate: dateStr, endDate: dateStr });
      setValidationError('Out of month range');
      return;
    }

    // Calculate new end date (preserve duration)
    const endDate = calculateNewEndDate(
      draggedReservation.check_in,
      draggedReservation.check_out,
      dateStr
    );

    // SYNC validation (fast, no await)
    const validation = validateMoveLocal(
      draggedReservation,
      campsiteId,
      dateStr,
      endDate
    );

    // Update preview state
    setDragPreview({ campsiteId, startDate: dateStr, endDate });
    setValidationError(validation.valid ? null : validation.error);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!dragPreview || validationError || !draggedReservation) {
      // Snap back - invalid drop
      return;
    }

    // Check for "no change" scenario
    // Handle both null and 'UNASSIGNED' comparisons
    const currentCampsiteId = draggedReservation.campsite_id || 'UNASSIGNED';
    const noChange =
      currentCampsiteId === dragPreview.campsiteId &&
      draggedReservation.check_in === dragPreview.startDate &&
      draggedReservation.check_out === dragPreview.endDate;

    if (noChange) {
      showToast('No changes made', 'info');
      return;
    }

    // Set pending move and show confirmation
    setPendingMove({
      reservation: draggedReservation,
      newCampsiteId: dragPreview.campsiteId,
      newStartDate: dragPreview.startDate,
      newEndDate: dragPreview.endDate,
    });
    setShowConfirmDialog(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedReservation(null);
    setDragPreview(null);
    setValidationError(null);
  };

  // Resize event handlers (pointer events)
  const handleResizeStart = (reservation: Reservation, side: ResizeSide) => {
    setResizeState({
      reservation,
      side,
      originalCheckIn: reservation.check_in,
      originalCheckOut: reservation.check_out,
      newCheckIn: reservation.check_in,
      newCheckOut: reservation.check_out,
    });
  };

  const getDateFromPointer = (clientX: number, clientY: number): string | null => {
    // Find the day cell under the pointer
    // Use elementsFromPoint to penetrate through the captured handle
    const elements = document.elementsFromPoint(clientX, clientY);
    const dayCell = elements.find(el => el.hasAttribute('data-date'));
    if (dayCell) {
      return dayCell.getAttribute('data-date');
    }
    return null;
  };

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeState) return;

    const hoveredDate = getDateFromPointer(e.clientX, e.clientY);
    if (!hoveredDate) return;

    let newCheckIn = resizeState.originalCheckIn;
    let newCheckOut = resizeState.originalCheckOut;

    if (resizeState.side === 'left') {
      // Resizing left handle (changing check-in)
      newCheckIn = hoveredDate;
    } else {
      // Resizing right handle (changing check-out)
      // Add 1 day since check_out is exclusive
      const hoveredDateObj = parseISO(hoveredDate);
      newCheckOut = format(addDays(hoveredDateObj, 1), 'yyyy-MM-dd');
    }

    // Always update state first (so ghost preview shows)
    setResizeState(prev => prev ? { ...prev, newCheckIn, newCheckOut } : null);

    // Then validate and set errors
    // Check if date is within month range
    if (!isDateInMonthRange(hoveredDate)) {
      setValidationError('Out of month range');
      return;
    }

    // Validate: must have at least 1 night
    if (newCheckOut <= newCheckIn) {
      setValidationError('Minimum 1 night required');
      return;
    }

    // Sync validation for conflicts
    const validation = validateMoveLocal(
      resizeState.reservation,
      resizeState.reservation.campsite_id || 'UNASSIGNED',
      newCheckIn,
      newCheckOut
    );

    setValidationError(validation.valid ? null : validation.error);
  }, [resizeState]);

  const handleResizeEnd = useCallback(() => {
    if (!resizeState) return;

    // Check for validation errors
    if (validationError) {
      // Snap back - invalid resize
      setResizeState(null);
      setValidationError(null);
      return;
    }

    // Check for no change
    const noChange =
      resizeState.newCheckIn === resizeState.originalCheckIn &&
      resizeState.newCheckOut === resizeState.originalCheckOut;

    if (noChange) {
      showToast('No changes made', 'info');
      setResizeState(null);
      return;
    }

    // Valid resize - show confirmation dialog
    setPendingMove({
      reservation: resizeState.reservation,
      newCampsiteId: resizeState.reservation.campsite_id || 'UNASSIGNED',
      newStartDate: resizeState.newCheckIn,
      newEndDate: resizeState.newCheckOut,
    });
    setShowConfirmDialog(true);
    setResizeState(null);
  }, [resizeState, validationError, showToast, setPendingMove, setShowConfirmDialog]);

  // Add/remove window pointer listeners for resize
  useEffect(() => {
    if (resizeState) {
      window.addEventListener('pointermove', handleResizeMove as any);
      window.addEventListener('pointerup', handleResizeEnd);
      return () => {
        window.removeEventListener('pointermove', handleResizeMove as any);
        window.removeEventListener('pointerup', handleResizeEnd);
      };
    }
  }, [resizeState, handleResizeMove, handleResizeEnd]);

  const handleConfirmReschedule = async () => {
    if (!pendingMove) return;

    setIsSubmitting(true);

    try {
      // Convert 'UNASSIGNED' to null for API
      const campsiteId = pendingMove.newCampsiteId === 'UNASSIGNED' ? null : pendingMove.newCampsiteId;

      const response = await fetch(`/api/admin/reservations/${pendingMove.reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campsite_id: campsiteId,
          check_in: pendingMove.newStartDate,
          check_out: pendingMove.newEndDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reschedule');
      }

      const data = await response.json();

      // Show success notification (use toast instead of alert)
      if (data.emailSent) {
        showToast('Reservation rescheduled successfully. Guest has been notified.', 'success');
      } else {
        showToast('Reservation rescheduled. Warning: Email notification failed.', 'warning');
      }

      // Refresh the page to get updated data (with slight delay to show toast)
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Reschedule error:', error);
      // Show error in dialog, keep it open for retry
      setValidationError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-heading font-bold text-slate-800">
            {format(date, "MMMM yyyy")}
          </h2>
          <div className="flex items-center rounded-md border border-slate-300 bg-white shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 border-r border-slate-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Confirmed
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span> Pending
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showAvailability}
              onChange={(e) => setShowAvailability(e.target.checked)}
              className="rounded text-brand-forest focus:ring-brand-forest"
            />
            <span className="font-medium text-slate-700">Show Availability</span>
          </label>
        </div>
      </div>

      {/* Grid Container - Scrollable */}
      <div className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full">
          {/* Header Row (Dates) */}
          <div className="flex sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
            {/* Corner Sticky */}
            <div className="sticky left-0 w-64 bg-slate-50 border-r border-slate-200 p-3 font-semibold text-slate-600 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-40">
              Campsite
            </div>
            {/* Days */}
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toString()}
                  className={`w-12 flex-shrink-0 text-center border-r border-slate-200 p-2 text-xs 
                    ${isWeekend(day) ? "bg-slate-100/50" : ""} 
                    ${isToday(day) ? "bg-blue-50" : ""}`}
                >
                  <div className="font-semibold text-slate-700">{format(day, "d")}</div>
                  <div className="text-slate-500 uppercase text-[10px]">{format(day, "EEEEE")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body Rows */}
          <div className="">
            {/* Unassigned Row */}
            {(() => {
              const unassignedReservations = reservations.filter(
                (r) => r.campsite_id === null || r.campsite_id === undefined
              );

              if (unassignedReservations.length === 0) return null;

              return (
                <div key="unassigned" className="flex border-b border-slate-200 bg-amber-50/30 hover:bg-amber-50/50 transition-colors group relative">
                  {/* Sticky Column */}
                  <div className="sticky left-0 w-64 bg-amber-50/30 group-hover:bg-amber-50/50 transition-colors border-r border-slate-200 p-3 flex items-center justify-between shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-20">
                    <div>
                      <div className="font-medium text-amber-900">Unassigned</div>
                      <div className="text-xs text-amber-700 flex items-center gap-1">
                        {unassignedReservations.length} reservation{unassignedReservations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-amber-500" title="Needs Assignment" />
                  </div>

                  {/* Day Cells */}
                  <div className="flex relative">
                    {days.map((day) => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const isHovered = dragPreview?.campsiteId === 'UNASSIGNED' && dragPreview?.startDate === dayStr;

                      return (
                        <div
                          key={day.toString()}
                          data-date={dayStr}
                          className={`w-12 h-16 flex-shrink-0 border-r border-slate-100 transition-colors bg-amber-50/20 ${
                            isDragging && isHovered
                              ? validationError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOverCell('UNASSIGNED', dayStr);
                          }}
                          onDrop={handleDrop}
                        />
                      );
                    })}

                    {/* Render Unassigned Reservations */}
                    {unassignedReservations.map((res) => (
                      <ReservationBlock
                        key={res.id}
                        reservation={res}
                        monthStart={monthStart}
                        monthEnd={monthEnd}
                        onSelect={handleReservationClick}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onResizeStart={handleResizeStart}
                        isDragging={draggedReservation?.id === res.id}
                        isResizing={resizeState?.reservation.id === res.id}
                      />
                    ))}

                    {/* Drag Ghost Preview */}
                    {dragPreview && dragPreview.campsiteId === 'UNASSIGNED' && (
                      <div
                        className={`absolute top-1 bottom-1 rounded-md px-2 py-1 border-2 border-dashed ${
                          validationError ? 'bg-red-100 border-red-400' : 'bg-green-100 border-green-400'
                        } opacity-50 z-50 pointer-events-none`}
                        style={{
                          left: `${(differenceInDays(parseISO(dragPreview.startDate), monthStart) / days.length) * 100}%`,
                          width: `${(differenceInDays(parseISO(dragPreview.endDate), parseISO(dragPreview.startDate)) / days.length) * 100}%`,
                        }}
                      >
                        <div className="text-xs truncate">
                          Unassigned • {format(parseISO(dragPreview.startDate), 'MMM d')} → {format(parseISO(dragPreview.endDate), 'MMM d')}
                        </div>
                      </div>
                    )}

                    {/* Resize Ghost Preview */}
                    {resizeState && (resizeState.reservation.campsite_id === null || resizeState.reservation.campsite_id === undefined) && (
                      <div
                        className={`absolute top-1 bottom-1 rounded-md px-2 py-1 border-2 border-dashed ${
                          validationError ? 'bg-red-100 border-red-400' : 'bg-blue-100 border-blue-400'
                        } opacity-50 z-50 pointer-events-none`}
                        style={{
                          left: `${(differenceInDays(parseISO(resizeState.newCheckIn), monthStart) / days.length) * 100}%`,
                          width: `${(differenceInDays(parseISO(resizeState.newCheckOut), parseISO(resizeState.newCheckIn)) / days.length) * 100}%`,
                        }}
                      >
                        <div className="text-xs truncate">
                          {differenceInDays(parseISO(resizeState.newCheckOut), parseISO(resizeState.newCheckIn))} nights
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Campsite Rows */}
            {campsites.map((campsite) => {
              // Get reservations for this campsite
              const siteReservations = reservations.filter(
                (r) => r.campsite_id === campsite.id || (r.campsites && r.campsites.code === campsite.code)
              );

              // Styling for inactive campsites
              const isInactive = !campsite.is_active;
              const rowBgClass = isInactive ? 'bg-red-50/20' : '';
              const rowHoverClass = isInactive ? 'hover:bg-red-50/30' : 'hover:bg-slate-50/50';
              const stickyBgClass = isInactive ? 'bg-red-50/20 group-hover:bg-red-50/30' : 'bg-white group-hover:bg-slate-50';

              return (
                <div key={campsite.id} className={`flex border-b border-slate-100 ${rowHoverClass} ${rowBgClass} transition-colors group relative ${isInactive ? 'border-red-200' : ''}`}>
                  {/* Sticky Column */}
                  <div className={`sticky left-0 w-64 ${stickyBgClass} transition-colors border-r border-slate-200 p-3 flex items-center justify-between shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-20 ${isInactive ? 'border-r-red-200' : ''}`}>
                    <div>
                      <div className="font-medium text-slate-900">{campsite.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="uppercase">{campsite.type}</span> • {campsite.max_guests} Guests
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: campsite.is_active ? '#10B981' : '#9CA3AF' }} title={campsite.is_active ? 'Active' : 'Inactive'} />
                  </div>

                  {/* Day Cells */}
                  <div className="flex relative">
                    {days.map((day) => {
                      // Check if day is occupied
                      const dayStr = format(day, "yyyy-MM-dd");
                      const isOccupied = siteReservations.some(res => 
                        dayStr >= res.check_in && dayStr < res.check_out // standard occupation logic
                      );

                      let bgClass = "";
                      if (showAvailability) {
                         if (!isOccupied) {
                           bgClass = "bg-emerald-50/50";
                         } else {
                           // Occupied
                         }
                      } else {
                         if (isWeekend(day)) bgClass = "bg-slate-50/30";
                         if (isToday(day)) bgClass = "bg-blue-50/20";
                      }

                      const isHovered = dragPreview?.campsiteId === campsite.id && dragPreview?.startDate === dayStr;

                      return (
                        <div
                          key={day.toString()}
                          data-date={dayStr}
                          className={`w-12 h-16 flex-shrink-0 border-r border-slate-100 transition-colors ${bgClass} ${
                            isDragging && isHovered
                              ? validationError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOverCell(campsite.id, dayStr);
                          }}
                          onDrop={handleDrop}
                        />
                      );
                    })}

                    {/* Render Reservations as Overlays */}
                    {siteReservations.map((res) => (
                      <ReservationBlock
                        key={res.id}
                        reservation={res}
                        monthStart={monthStart}
                        monthEnd={monthEnd}
                        onSelect={handleReservationClick}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onResizeStart={handleResizeStart}
                        isDragging={draggedReservation?.id === res.id}
                        isResizing={resizeState?.reservation.id === res.id}
                      />
                    ))}

                    {/* Ghost Preview */}
                    {dragPreview && dragPreview.campsiteId === campsite.id && (
                      <div
                        className={`absolute top-1 bottom-1 rounded-md px-2 py-1 border-2 border-dashed ${
                          validationError ? 'bg-red-100 border-red-400' : 'bg-green-100 border-green-400'
                        } opacity-50 z-50 pointer-events-none`}
                        style={{
                          left: `${(differenceInDays(parseISO(dragPreview.startDate), monthStart) / days.length) * 100}%`,
                          width: `${(differenceInDays(parseISO(dragPreview.endDate), parseISO(dragPreview.startDate)) / days.length) * 100}%`,
                        }}
                      >
                        <div className="text-xs truncate">
                          {campsite.code} • {format(parseISO(dragPreview.startDate), 'MMM d')} → {format(parseISO(dragPreview.endDate), 'MMM d')}
                        </div>
                      </div>
                    )}

                    {/* Resize Ghost Preview */}
                    {resizeState && resizeState.reservation.campsite_id === campsite.id && (
                      <div
                        className={`absolute top-1 bottom-1 rounded-md px-2 py-1 border-2 border-dashed ${
                          validationError ? 'bg-red-100 border-red-400' : 'bg-blue-100 border-blue-400'
                        } opacity-50 z-50 pointer-events-none`}
                        style={{
                          left: `${(differenceInDays(parseISO(resizeState.newCheckIn), monthStart) / days.length) * 100}%`,
                          width: `${(differenceInDays(parseISO(resizeState.newCheckOut), parseISO(resizeState.newCheckIn)) / days.length) * 100}%`,
                        }}
                      >
                        <div className="text-xs truncate">
                          {differenceInDays(parseISO(resizeState.newCheckOut), parseISO(resizeState.newCheckIn))} nights
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ReservationDrawer
        reservation={selectedReservation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <RescheduleConfirmDialog
        isOpen={showConfirmDialog}
        reservation={pendingMove?.reservation || null}
        oldCampsiteName={
          pendingMove?.reservation.campsite_id
            ? campsites.find(c => c.id === pendingMove.reservation.campsite_id)?.name || 'Unassigned'
            : 'Unassigned'
        }
        newCampsiteName={
          pendingMove?.newCampsiteId === 'UNASSIGNED'
            ? 'Unassigned'
            : campsites.find(c => c.id === pendingMove?.newCampsiteId)?.name || 'Unassigned'
        }
        oldStartDate={pendingMove?.reservation.check_in || ''}
        oldEndDate={pendingMove?.reservation.check_out || ''}
        newStartDate={pendingMove?.newStartDate || ''}
        newEndDate={pendingMove?.newEndDate || ''}
        onConfirm={handleConfirmReschedule}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingMove(null);
          setValidationError(null);
        }}
        isSubmitting={isSubmitting}
        validationError={validationError}
      />
    </div>
  );
}
