"use client";

import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { Campsite, Reservation, BlackoutDate } from "@/lib/supabase";
import { format, eachDayOfInterval, isSameMonth, isToday, isWeekend, startOfMonth, endOfMonth, parseISO, differenceInDays, addDays } from "date-fns";
import ReservationBlock from "./ReservationBlock";
import ReservationDrawer from "./ReservationDrawer";
import RescheduleConfirmDialog from "./RescheduleConfirmDialog";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import InstructionalOverlay from "./InstructionalOverlay";
import EmptyStateHelper from "./EmptyStateHelper";
import CreationDialog from "./CreationDialog";
import { useRouter } from "next/navigation";

// Throttle utility for performance optimization
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    lastArgs = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeout = null;
        lastArgs = null;
      }, wait);
    }
  };
}

interface CalendarGridProps {
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  date: Date; // The month we are viewing
  onDateChange: (date: Date) => void;
}

export default function CalendarGrid({
  campsites,
  reservations,
  blackoutDates = [],
  date,
  onDateChange,
}: CalendarGridProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  // Refs for auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollAnimationFrameRef = useRef<number | null>(null);

  // Drag-and-drop state (Move)
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

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState<{ campsiteId: string; date: string } | null>(null);
  const [creationEnd, setCreationEnd] = useState<{ campsiteId: string; date: string } | null>(null);
  const [showCreationDialog, setShowCreationDialog] = useState(false);

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

  // Constants for auto-scroll
  const SCROLL_ZONE_PX = 60;
  const SCROLL_SPEED = 12;

  // Smooth auto-scroll using requestAnimationFrame
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { x, y } = scrollDirectionRef.current;

      if (x !== 0 || y !== 0) {
        container.scrollBy({
          left: x * SCROLL_SPEED,
          top: y * SCROLL_SPEED,
          behavior: 'auto'
        });
        scrollAnimationFrameRef.current = requestAnimationFrame(tick);
      } else {
        scrollAnimationFrameRef.current = null;
      }
    };

    if (!scrollAnimationFrameRef.current) {
      scrollAnimationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    scrollDirectionRef.current = { x: 0, y: 0 };
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const updateScrollDirection = useCallback((clientX: number, clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    let x = 0;
    let y = 0;

    // Horizontal scrolling
    if (clientX < rect.left + SCROLL_ZONE_PX) {
      x = -1; // Scroll left
    } else if (clientX > rect.right - SCROLL_ZONE_PX) {
      x = 1; // Scroll right
    }

    // Vertical scrolling
    if (clientY < rect.top + SCROLL_ZONE_PX) {
      y = -1; // Scroll up
    } else if (clientY > rect.bottom - SCROLL_ZONE_PX) {
      y = 1; // Scroll down
    }

    const directionChanged =
      scrollDirectionRef.current.x !== x ||
      scrollDirectionRef.current.y !== y;

    scrollDirectionRef.current = { x, y };

    if ((x !== 0 || y !== 0) && directionChanged) {
      startAutoScroll();
    } else if (x === 0 && y === 0) {
      stopAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

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

  // Store the actual heavy logic separately
  const updateDragPreview = useCallback((campsiteId: string, dateStr: string) => {
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
  }, [draggedReservation, monthStart, monthEnd, campsites, reservations]);

  // Throttled version - only runs every 16ms (~60fps)
  const handleDragOverCell = useMemo(
    () => throttle(updateDragPreview, 16),
    [updateDragPreview]
  );

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

    // Stop auto-scroll
    if (autoScrollIntervalRef.current) {
      window.clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  // Auto-scroll when dragging near edges
  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e: DragEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollThreshold = 80; // Distance from edge to trigger scroll
      const scrollSpeed = 15; // Pixels to scroll per interval

      // Calculate distance from edges
      const distanceFromLeft = e.clientX - rect.left;
      const distanceFromRight = rect.right - e.clientX;
      const distanceFromTop = e.clientY - rect.top;
      const distanceFromBottom = rect.bottom - e.clientY;

      // Clear existing interval
      if (autoScrollIntervalRef.current) {
        window.clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      // Determine scroll direction
      let scrollX = 0;
      let scrollY = 0;

      // Horizontal scrolling (most important for calendar)
      if (distanceFromLeft < scrollThreshold && distanceFromLeft > 0) {
        scrollX = -scrollSpeed;
      } else if (distanceFromRight < scrollThreshold && distanceFromRight > 0) {
        scrollX = scrollSpeed;
      }

      // Vertical scrolling
      if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
        scrollY = -scrollSpeed;
      } else if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
        scrollY = scrollSpeed;
      }

      // Start auto-scroll if needed
      if (scrollX !== 0 || scrollY !== 0) {
        autoScrollIntervalRef.current = window.setInterval(() => {
          if (container) {
            container.scrollBy({
              left: scrollX,
              top: scrollY,
              behavior: 'auto' // Smooth but immediate
            });
          }
        }, 16); // ~60fps
      }
    };

    // Add event listener
    document.addEventListener('dragover', handleDragMove);

    // Cleanup
    return () => {
      document.removeEventListener('dragover', handleDragMove);
      if (autoScrollIntervalRef.current) {
        window.clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, [isDragging]);

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

  // Heavy resize logic - separated for throttling
  const updateResizePreview = useCallback((e: PointerEvent) => {
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
  }, [resizeState, monthStart, monthEnd, campsites, reservations]);

  // Throttled resize handler - 16ms for smooth ~60fps
  const throttledResizePreview = useMemo(
    () => throttle(updateResizePreview, 16),
    [updateResizePreview]
  );

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeState) return;

    // Update auto-scroll direction immediately (visual feedback)
    updateScrollDirection(e.clientX, e.clientY);

    // Throttle the heavy validation and state updates
    throttledResizePreview(e);
  }, [resizeState, updateScrollDirection, throttledResizePreview]);

  const handleResizeEnd = useCallback(() => {
    // Stop auto-scroll
    stopAutoScroll();

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
  }, [resizeState, validationError, showToast, setPendingMove, setShowConfirmDialog, stopAutoScroll]);

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

  // Creation Handlers
  const handleCellMouseDown = (campsiteId: string, dateStr: string) => {
    // Only start if not dragging an existing reservation
    if (isDragging || resizeState) return;
    
    setIsCreating(true);
    setCreationStart({ campsiteId, date: dateStr });
    setCreationEnd({ campsiteId, date: dateStr });
  };

  const handleCellMouseEnter = (campsiteId: string, dateStr: string) => {
    if (!isCreating || !creationStart) return;
    
    // Only allow selection within the same campsite
    if (campsiteId !== creationStart.campsiteId) return;

    setCreationEnd({ campsiteId, date: dateStr });
  };

  const handleCellMouseUp = () => {
    if (!isCreating || !creationStart || !creationEnd) return;

    setIsCreating(false);
    setShowCreationDialog(true);
  };

  const handleCreateBlackout = async (reason: string) => {
    if (!creationStart || !creationEnd) return;

    // Ensure start is before end
    let start = creationStart.date;
    let end = creationEnd.date;
    if (start > end) {
      [start, end] = [end, start];
    }
    // Add 1 day to end for inclusive logic if needed, but blackout usually inclusive [start, end]
    // DB usually expects inclusive range.

    try {
      const response = await fetch('/api/admin/blackout-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          campsite_id: creationStart.campsiteId,
          reason
        }),
      });

      if (!response.ok) throw new Error('Failed to create blackout');

      showToast('Blackout dates added', 'success');
      // Refresh
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error(error);
      showToast('Failed to create blackout', 'error');
    }
  };

  const getSelectionRange = () => {
    if (!creationStart || !creationEnd) return null;
    let start = creationStart.date;
    let end = creationEnd.date;
    if (start > end) [start, end] = [end, start];
    return { start, end, campsiteId: creationStart.campsiteId };
  };

  const selection = getSelectionRange();

  return (
    <div className="flex flex-col h-full admin-card overflow-hidden relative select-none">
      <InstructionalOverlay />
      {blackoutDates.length === 0 && reservations.length === 0 && <EmptyStateHelper />}
      
      {selection && showCreationDialog && (
        <CreationDialog
          isOpen={showCreationDialog}
          onClose={() => {
            setShowCreationDialog(false);
            setCreationStart(null);
            setCreationEnd(null);
          }}
          startDate={selection.start}
          endDate={selection.end}
          campsiteId={selection.campsiteId}
          campsiteCode={campsites.find(c => c.id === selection.campsiteId)?.code}
          onCreateBlackout={handleCreateBlackout}
          onCreateReservation={() => router.push(`/admin/reservations/new?start=${selection.start}&end=${selection.end}&campsite=${selection.campsiteId}`)}
        />
      )}
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-heading font-bold text-[var(--color-text-primary)]">
            {format(date, "MMMM yyyy")}
          </h2>
          <div className="flex items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-r border-[var(--color-border-strong)] transition-surface"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] transition-surface"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs opacity-75">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-status-active)]"></span> Confirmed
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-status-pending)]"></span> Pending
          </div>
          <div className="hidden xl:block text-[var(--color-text-muted)] italic">
            Tip: Drag to create a reservation or blackout
            <a href="/admin/help?article=add-blackout-dates" target="_blank" className="ml-2 text-brand-forest hover:underline not-italic font-medium text-xs">
                 Need help?
            </a>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none opacity-100">
            <input
              type="checkbox"
              checked={showAvailability}
              onChange={(e) => setShowAvailability(e.target.checked)}
              className="rounded text-brand-forest focus:ring-brand-forest"
            />
            <span className="font-medium text-[var(--color-text-primary)]">Show Availability</span>
          </label>
        </div>
      </div>

      {/* Grid Container - Scrollable */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-auto relative"
        onMouseUp={handleCellMouseUp} 
        onMouseLeave={() => {
           if (isCreating) {
             setIsCreating(false);
             setCreationStart(null);
             setCreationEnd(null);
           }
        }}
      >
        <div className="inline-block min-w-full">
          {/* Header Row (Dates) */}
          <div className="flex sticky top-0 z-30 bg-[var(--color-surface-elevated)] border-b-2 border-[var(--color-border-strong)]">
            {/* Corner Sticky */}
            <div className="sticky left-0 w-32 sm:w-48 lg:w-64 bg-[var(--color-surface-elevated)] border-r border-[var(--color-border-default)] py-3 px-2 lg:px-3 font-semibold text-[var(--color-text-muted)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-40 text-xs lg:text-sm">
              Campsite
            </div>
            {/* Days */}
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toString()}
                  className={`w-8 lg:w-10 xl:w-12 flex-shrink-0 text-center border-r border-[var(--color-border-default)] py-2 px-1 lg:py-3 lg:px-2 text-xs
                    ${isWeekend(day) ? "bg-[var(--color-surface-elevated)]/50" : ""}
                    ${isToday(day) ? "bg-[var(--color-status-active)]/15 border-t-2 border-t-[var(--color-status-active)]" : ""}`}
                >
                  <div className="font-semibold text-[var(--color-text-primary)] text-[10px] lg:text-xs">{format(day, "d")}</div>
                  <div className="text-[var(--color-text-muted)] uppercase text-[8px] lg:text-[10px] hidden sm:block">{format(day, "EEEEE")}</div>
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
                <div key="unassigned" className="flex border-b border-[var(--color-border-default)] bg-[var(--color-status-pending-bg)] hover:bg-[var(--color-status-pending-bg)]/70 transition-surface group relative">
                  {/* Sticky Column */}
                  <div className="sticky left-0 w-32 sm:w-48 lg:w-64 bg-[var(--color-status-pending-bg)] group-hover:bg-[var(--color-status-pending-bg)]/70 transition-surface border-r border-[var(--color-border-default)] p-2 lg:p-3 flex items-center justify-between shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-20">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--color-text-primary)] text-xs lg:text-sm truncate">Unassigned</div>
                      <div className="text-[10px] lg:text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        {unassignedReservations.length} reservation{unassignedReservations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[var(--color-status-pending)] flex-shrink-0" title="Needs Assignment" />
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
                          className={`w-8 lg:w-10 xl:w-12 h-10 lg:h-12 xl:h-14 flex-shrink-0 border-r border-[var(--color-border-subtle)] transition-surface bg-[var(--color-status-pending-bg)]/50 ${
                            isDragging && isHovered
                              ? validationError ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]' : 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                              : ''
                          } ${
                            isCreating && selection?.campsiteId === 'UNASSIGNED' && dayStr >= selection.start && dayStr <= selection.end
                            ? 'bg-[var(--color-accent-gold)]/20'
                            : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOverCell('UNASSIGNED', dayStr);
                          }}
                          onDrop={handleDrop}
                          onMouseDown={() => handleCellMouseDown('UNASSIGNED', dayStr)}
                          onMouseEnter={() => handleCellMouseEnter('UNASSIGNED', dayStr)}
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
                          validationError ? 'bg-[var(--color-error)]/20 border-[var(--color-error)]' : 'bg-[var(--color-success)]/20 border-[var(--color-success)]'
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
                          validationError ? 'bg-[var(--color-error)]/20 border-[var(--color-error)]' : 'bg-[var(--color-status-active)]/20 border-[var(--color-status-active)]'
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
              
              const siteBlackouts = blackoutDates.filter(
                (b) => b.campsite_id === campsite.id
              );

              // Styling for inactive campsites
              const isInactive = !campsite.is_active;
              const rowBgClass = isInactive ? 'bg-[var(--color-error)]/10' : '';
              const rowHoverClass = isInactive ? 'hover:bg-[var(--color-error)]/15' : 'hover:bg-[var(--color-surface-elevated)]/50';
              const stickyBgClass = isInactive ? 'bg-[var(--color-error)]/10 group-hover:bg-[var(--color-error)]/15' : 'bg-[var(--color-surface-card)] group-hover:bg-[var(--color-surface-elevated)]';

              return (
                <div key={campsite.id} className={`flex border-b border-[var(--color-border-subtle)] ${rowHoverClass} ${rowBgClass} transition-surface group relative ${isInactive ? 'border-[var(--color-error)]/30' : ''}`}>
                  {/* Sticky Column */}
                  <div className={`sticky left-0 w-32 sm:w-48 lg:w-64 ${stickyBgClass} transition-surface border-r border-[var(--color-border-default)] p-2 lg:p-3 flex items-center justify-between shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-20 ${isInactive ? 'border-r-[var(--color-error)]/30' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--color-text-primary)] text-xs lg:text-sm truncate">{campsite.name}</div>
                      <div className="text-[10px] lg:text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className="uppercase">{campsite.type}</span> • {campsite.max_guests} Guests
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: campsite.is_active ? 'var(--color-success)' : 'var(--color-status-neutral)' }} title={campsite.is_active ? 'Active' : 'Inactive'} />
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
                           bgClass = "bg-[var(--color-success)]/10";
                         } else {
                           // Occupied
                         }
                      } else {
                         if (isWeekend(day)) bgClass = "bg-[var(--color-surface-elevated)]/30";
                         if (isToday(day)) bgClass = "bg-[var(--color-status-active)]/15";
                      }

                      const isHovered = dragPreview?.campsiteId === campsite.id && dragPreview?.startDate === dayStr;

                      return (
                        <div
                          key={day.toString()}
                          data-date={dayStr}
                          className={`w-8 lg:w-10 xl:w-12 h-10 lg:h-12 xl:h-14 flex-shrink-0 border-r border-[var(--color-border-subtle)] transition-surface ${bgClass} ${
                            isDragging && isHovered
                              ? validationError ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]' : 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                              : ''
                          } ${
                            isCreating && selection?.campsiteId === campsite.id && dayStr >= selection.start && dayStr <= selection.end
                            ? 'bg-[var(--color-accent-gold)]/20'
                            : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOverCell(campsite.id, dayStr);
                          }}
                          onDrop={handleDrop}
                          onMouseDown={() => handleCellMouseDown(campsite.id, dayStr)}
                          onMouseEnter={() => handleCellMouseEnter(campsite.id, dayStr)}
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

                    {/* Blackout Dates Overlays */}
                    {siteBlackouts.map((blackout) => {
                        const start = blackout.start_date < format(monthStart, 'yyyy-MM-dd') ? format(monthStart, 'yyyy-MM-dd') : blackout.start_date;
                        const end = blackout.end_date > format(monthEnd, 'yyyy-MM-dd') ? format(monthEnd, 'yyyy-MM-dd') : blackout.end_date;
                        
                        // Check if visible
                        if (start > end) return null;

                        const duration = differenceInDays(parseISO(end), parseISO(start)) + 1; // Inclusive
                        const offset = differenceInDays(parseISO(start), monthStart);
                        
                        return (
                          <div
                            key={blackout.id}
                            className="absolute top-1 bottom-1 bg-red-500/10 border-2 border-red-500/30 w-full z-10 flex items-center justify-center overflow-hidden pointer-events-none rounded-md"
                            style={{
                              left: `${(offset / days.length) * 100}%`,
                              width: `${(duration / days.length) * 100}%`,
                            }}
                            title={`Blackout: ${blackout.reason || 'Unavailable'}`}
                          >
                            <div className="flex items-center gap-1.5 px-2 overflow-hidden w-full justify-center">
                                <Ban className="text-red-500/50 w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-[10px] sm:text-xs font-medium text-red-600/70 truncate uppercase tracking-wide">
                                    {blackout.reason || "Unavailable"}
                                </span>
                            </div>
                          </div>
                        );
                    })}

                    {/* Ghost Preview */}
                    {dragPreview && dragPreview.campsiteId === campsite.id && (
                      <div
                        className={`absolute top-1 bottom-1 rounded-md px-2 py-1 border-2 border-dashed ${
                          validationError ? 'bg-[var(--color-error)]/20 border-[var(--color-error)]' : 'bg-[var(--color-success)]/20 border-[var(--color-success)]'
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
                          validationError ? 'bg-[var(--color-error)]/20 border-[var(--color-error)]' : 'bg-[var(--color-status-active)]/20 border-[var(--color-status-active)]'
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
