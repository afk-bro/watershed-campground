"use client";

import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { Campsite, Reservation, BlackoutDate } from "@/lib/supabase";
import { format, eachDayOfInterval, isSameMonth, isToday, isWeekend, startOfMonth, endOfMonth, parseISO, differenceInDays, addDays, subDays } from "date-fns";
import ReservationBlock from "./ReservationBlock";
import BlackoutBlock from "./BlackoutBlock";
import ReservationDrawer from "./ReservationDrawer";
import RescheduleConfirmDialog from "./RescheduleConfirmDialog";
import GhostPreview from "./GhostPreview";
import CalendarCell from "./CalendarCell";
import { ChevronLeft, ChevronRight, Ban, Hand, ArrowLeftToLine, Calendar as CalendarIcon, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import InstructionalOverlay from "./InstructionalOverlay";
import EmptyStateHelper from "./EmptyStateHelper";
import CreationDialog from "./CreationDialog";
import { useRouter } from "next/navigation";
import type { GhostState, CalendarData } from "@/lib/calendar/calendar-types";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { useCalendarSelection } from "./hooks/useCalendarSelection";
import { useDragResize } from "./hooks/useDragResize";
import { useBlackoutManager } from "./hooks/useBlackoutManager";
import { useCalendarPanning } from "./hooks/useCalendarPanning";
import { useSyncedScroll } from "./hooks/useSyncedScroll";
import { useStuckSavingFailsafe } from "./hooks/useStuckSavingFailsafe";
import { useReservationMutations } from "./hooks/useReservationMutations";
import SyncedScrollbar from "./SyncedScrollbar";
import CalendarControls from "./CalendarControls";
import BlackoutDrawer from "./BlackoutDrawer";
import CalendarLegend from "./CalendarLegend";
import NoCampsitesCTA from "./NoCampsitesCTA";


interface CalendarGridProps {
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  date: Date; // The month we are viewing
  onDateChange: (date: Date) => void;
  onDataMutate?: (
    data?: CalendarData | Promise<CalendarData> | ((current: CalendarData | undefined) => CalendarData | Promise<CalendarData>),
    options?: { optimisticData?: CalendarData; rollbackOnError?: boolean; populateCache?: boolean; revalidate?: boolean }
  ) => Promise<CalendarData | undefined>;
}

export default function CalendarGrid({
  campsites,
  reservations,
  blackoutDates = [],
  date,
  onDateChange,
  onDataMutate,
}: CalendarGridProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // UI state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [todayX, setTodayX] = useState<number | null>(null);
  const headerTodayRef = useRef<HTMLDivElement>(null);

  // Sync today position
  useEffect(() => {
    if (headerTodayRef.current) {
      setTodayX(headerTodayRef.current.offsetLeft);
    } else {
      setTodayX(null);
    }
  }, [date, campsites.length]); // Re-calc when month or campsite list changes

  // Dev-only invariant checks (catches cache reconciliation bugs)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Check for duplicate reservation IDs
    const reservationIds = reservations.map(r => r.id);
    const uniqueReservationIds = new Set(reservationIds);
    if (reservationIds.length !== uniqueReservationIds.size) {
      console.error('❌ INVARIANT VIOLATION: Duplicate reservation IDs detected!', {
        total: reservationIds.length,
        unique: uniqueReservationIds.size,
        duplicates: reservationIds.filter((id, index) => reservationIds.indexOf(id) !== index)
      });
    }

    // Check for duplicate blackout IDs
    const blackoutIds = blackoutDates.map(b => b.id);
    const uniqueBlackoutIds = new Set(blackoutIds);
    if (blackoutIds.length !== uniqueBlackoutIds.size) {
      console.error('❌ INVARIANT VIOLATION: Duplicate blackout IDs detected!', {
        total: blackoutIds.length,
        unique: uniqueBlackoutIds.size,
        duplicates: blackoutIds.filter((id, index) => blackoutIds.indexOf(id) !== index)
      });
    }

    // Check for temp IDs that aren't currently saving
    const tempReservations = reservations.filter(r => r.id?.startsWith('temp_') && !(r as any)._saving);
    if (tempReservations.length > 0) {
      console.error('❌ INVARIANT VIOLATION: Temp reservation IDs found that are not saving!', {
        count: tempReservations.length,
        ids: tempReservations.map(r => r.id)
      });
    }

    const tempBlackouts = blackoutDates.filter(b => b.id?.startsWith('temp_') && !(b as any)._saving);
    if (tempBlackouts.length > 0) {
      console.error('❌ INVARIANT VIOLATION: Temp blackout IDs found that are not saving!', {
        count: tempBlackouts.length,
        ids: tempBlackouts.map(b => b.id)
      });
    }
  }, [reservations, blackoutDates]);

  const [pendingMove, setPendingMove] = useState<{
    reservation: Reservation;
    newCampsiteId: string;
    newStartDate: string;
    newEndDate: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogError, setConfirmDialogError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | 'ALL'>("ALL");
  const [hideBlackouts, setHideBlackouts] = useState(false);

  // Mutation Hooks
  const {
      selectedBlackout,
      isBlackoutDrawerOpen,
      openDrawer: openBlackoutDrawer,
      closeDrawer: closeBlackoutDrawer,
      createBlackout,
      updateBlackout,
      deleteBlackout
  } = useBlackoutManager({ onDataMutate });

  const { rescheduleReservation } = useReservationMutations({ onDataMutate });

  // Stuck Saving Failsafe - auto-revalidate if items stuck saving for >10s
  const lastRevalidateRef = useRef(0);
  const handleRevalidate = useCallback(() => {
    if (!onDataMutate) return;

    // Throttle: only allow one revalidate per 3 seconds
    // Prevents spamming server if multiple items get stuck simultaneously
    const now = Date.now();
    if (now - lastRevalidateRef.current < 3000) {
      console.log('[STUCK SAVING FAILSAFE] Skipping revalidate (throttled - multiple items stuck)');
      return;
    }

    lastRevalidateRef.current = now;
    console.log('[STUCK SAVING FAILSAFE] Auto-revalidating calendar data');
    onDataMutate(undefined, { revalidate: true });
  }, [onDataMutate]);

  useStuckSavingFailsafe({
    reservations,
    blackoutDates,
    onRevalidate: handleRevalidate,
  });

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = differenceInDays(monthEnd, monthStart) + 1;

  // Filtered Data
  const filteredCampsites = useMemo(() => {
    if (typeFilter === 'ALL') return campsites;
    return campsites.filter(c => c.type === typeFilter);
  }, [campsites, typeFilter]);

  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.first_name.toLowerCase().includes(query) ||
        r.last_name.toLowerCase().includes(query) ||
        (r.id && r.id.toLowerCase().includes(query)) ||
        (r.email && r.email.toLowerCase().includes(query))
      );
    }

    return result;
  }, [reservations, searchQuery]);

  // Determine which blackouts to show
  const visibleBlackoutDates = useMemo(() => {
      if (hideBlackouts) return [];
      return blackoutDates;
  }, [blackoutDates, hideBlackouts]);

  // Auto-scroll hook
  const { scrollContainerRef, updateScrollDirection, stopAutoScroll } = useAutoScroll();
  // Panning hook
  const { headerProps, containerProps } = useCalendarPanning({ scrollContainerRef });

  // Synced Top Scrollbar
  const { slaveRef } = useSyncedScroll(scrollContainerRef);
  const contentRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLInputElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [showFloatingRail, setShowFloatingRail] = useState(false);

  // Measure content width for synced scrollbar
  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.scrollWidth);
    }
  }, [days.length, campsites.length, reservations.length]);

  // Toggle floating rail based on scroll position - Show when valid
  useEffect(() => {
    const handleScroll = () => {
       // Show when scrolled down a bit to keep header accessible optionally, 
       // but here we just show it always or based on user pref?
       // User asked: "Add a floating mini rail at bottom only when scrolled down".
       // So we check window.scrollY.
       setShowFloatingRail(window.scrollY > 200); 
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Ref needed for HTML5 drag auto-scroll (legacy pattern)
  const autoScrollIntervalRef = useRef<number | null>(null);
  
  // Handle move request from drag/resize hook
  const handleMoveRequested = useCallback((
    reservation: Reservation,
    newCampsiteId: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    setPendingMove({
      reservation,
      newCampsiteId,
      newStartDate,
      newEndDate,
    });
    setShowConfirmDialog(true);
  }, []);

  // Handle blackout move request from drag/resize hook
  const handleBlackoutMoveRequested = useCallback(async (
    blackout: BlackoutDate,
    newCampsiteId: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    // Fall back to reload if no mutate function provided
    if (!onDataMutate) {
      console.warn('[BLACKOUT MOVE] No mutate function provided, falling back to reload');
      try {
        const response = await fetch(`/api/admin/blackout-dates/${blackout.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campsite_id: newCampsiteId === 'UNASSIGNED' ? null : newCampsiteId,
            start_date: newStartDate,
            end_date: newEndDate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update blackout date');
        }

        showToast('Blackout date updated successfully', 'success');
        window.location.reload();
      } catch (error: unknown) {
        console.error('[BLACKOUT MOVE ERROR]', error);
        showToast(error instanceof Error ? error.message : 'Failed to update blackout date', 'error');
      }
      return;
    }

    try {
      console.log('[BLACKOUT MOVE] Optimistic update', {
        blackoutId: blackout.id,
        from: { start: blackout.start_date, end: blackout.end_date, campsite: blackout.campsite_id },
        to: { start: newStartDate, end: newEndDate, campsite: newCampsiteId },
      });

      // Optimistic update with SWR
      await onDataMutate(
        async (current) => {
          if (!current) throw new Error('No current data');

          // Create optimistic updated blackout
          const updatedBlackout: BlackoutDate = {
            ...blackout,
            start_date: newStartDate,
            end_date: newEndDate,
            campsite_id: newCampsiteId === 'UNASSIGNED' ? null : newCampsiteId,
          };

          // Optimistically update the local data
          const optimisticData: CalendarData = {
            ...current,
            blackoutDates: current.blackoutDates.map(b =>
              b.id === blackout.id ? updatedBlackout : b
            ),
          };

          // Make API call
          const response = await fetch(`/api/admin/blackout-dates/${blackout.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campsite_id: newCampsiteId === 'UNASSIGNED' ? null : newCampsiteId,
              start_date: newStartDate,
              end_date: newEndDate,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update blackout date');
          }

          const serverBlackout = await response.json();
          console.log('[BLACKOUT MOVE] Server confirmed:', serverBlackout);

          // Return updated data with server response
          return {
            ...current,
            blackoutDates: current.blackoutDates.map(b =>
              b.id === blackout.id ? serverBlackout : b
            ),
          };
        },
        {
          rollbackOnError: true,
          revalidate: false, // Don't revalidate immediately, we have the server response
        }
      );

      showToast('Blackout date updated successfully', 'success');
    } catch (error: unknown) {
      console.error('[BLACKOUT MOVE ERROR]', error);
      showToast(error instanceof Error ? error.message : 'Failed to update blackout date', 'error');
      // SWR automatically rolls back on error
    }
  }, [onDataMutate, showToast]);

  // Drag and resize hook
  const {
    isDragging,
    draggedItem,
    dragPreview,
    resizeState,
    validationError,
    handleDragStart,
    handleDragOverCell,
    handleDrop,
    handleDragEnd,
    handleResizeStart,
    getGhost,
  } = useDragResize({
    monthStart,
    monthEnd,
    campsites,
    reservations,
    blackoutDates,
    autoScrollIntervalRef,
    onReservationMoveRequested: handleMoveRequested,
    onBlackoutMoveRequested: handleBlackoutMoveRequested,
    updateScrollDirection,
    stopAutoScroll,
  });

  // Validation for cell selection during creation
  const isValidSelectionCell = useCallback((campsiteId: string, dateStr: string) => {
    // Check if cell is occupied by reservation
    const isOccupiedByReservation = reservations.some(res =>
      res.campsite_id === campsiteId && dateStr >= res.check_in && dateStr < res.check_out && res.status !== 'cancelled'
    );
    // Check if cell is occupied by blackout
    const isOccupiedByBlackout = blackoutDates.some(b =>
      (b.campsite_id === campsiteId || b.campsite_id === null) && dateStr >= b.start_date && dateStr <= b.end_date
    );
    return !isOccupiedByReservation && !isOccupiedByBlackout;
  }, [reservations, blackoutDates]);

  // Calendar selection hook (after drag/resize so we can check their state)
  const {
    isCreating,
    creationStart,
    creationEnd,
    selection,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerUp: handleCellPointerUpBase,
    handleCellPointerCancel,
    clearSelection,
  } = useCalendarSelection(!isDragging && !resizeState, isValidSelectionCell);

  // Wrap handleCellPointerUp to also show dialog
  const handleCellPointerUp = useCallback(() => {
    handleCellPointerUpBase();
  }, [handleCellPointerUpBase]);

  // Show creation dialog when selection is non-null and creation has ended
  useEffect(() => {
    if (!isCreating && selection && creationStart && creationEnd) {
      setShowCreationDialog(true);
    }
  }, [isCreating, selection, creationStart, creationEnd]);
  
  const handleReservationClick = (res: Reservation) => {
    setSelectedReservation(res);
    setIsDrawerOpen(true);
  };

  // Blackout click handler
  const handleBlackoutClick = (blackout: BlackoutDate) => {
    openBlackoutDrawer(blackout);
  };

  const handlePrevMonth = () => {
    onDateChange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    onDateChange(new Date());
  };

  const handleConfirmReschedule = async () => {
    if (!pendingMove) return;

    setIsSubmitting(true);
    setConfirmDialogError(null);

    try {
      await rescheduleReservation({
        reservation: pendingMove.reservation,
        newCampsiteId: pendingMove.newCampsiteId,
        newStartDate: pendingMove.newStartDate,
        newEndDate: pendingMove.newEndDate,
      });

      // Close dialog on success
      setShowConfirmDialog(false);
      setPendingMove(null);
      setConfirmDialogError(null);
    } catch (error: unknown) {
      // Show error in dialog, keep it open for retry
      setConfirmDialogError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ref to track if we're currently creating (prevents stale closures)
  const isCreatingRef = useRef(isCreating);
  useEffect(() => {
    isCreatingRef.current = isCreating;
  }, [isCreating]);

  // Auto-scroll during creation drag - stabilized handler using refs
  // This function is created once and never recreates, preventing listener thrash
  const handleCreationPointerMove = useCallback((e: PointerEvent) => {
    // Read current state from ref to avoid stale closures
    if (!isCreatingRef.current) return;
    updateScrollDirection(e.clientX, e.clientY);
  }, [updateScrollDirection]); // Only depends on updateScrollDirection, not isCreating

  // Add/remove window pointer listeners for creation drag
  // Attaches ONCE when isCreating becomes true, removes when it becomes false
  useEffect(() => {
    if (isCreating) {
      console.log('[CREATION] Setting up pointermove listener for auto-scroll');
      window.addEventListener('pointermove', handleCreationPointerMove);
      return () => {
        console.log('[CREATION] Removing pointermove listener');
        window.removeEventListener('pointermove', handleCreationPointerMove);
        stopAutoScroll(); // Stop any active scrolling
      };
    }
  }, [isCreating, handleCreationPointerMove, stopAutoScroll]);

  const handleCreateBlackout = async (reason: string) => {
    if (!creationStart || !creationEnd) return;

    // Check if we have a valid campsite ID
    if (!creationStart.campsiteId || creationStart.campsiteId === 'UNASSIGNED') {
        showToast('Cannot create blackout on Unassigned row', 'error');
        return;
    }

    try {
      await createBlackout(creationStart.date, creationEnd.date, creationStart.campsiteId, reason);
    } catch (error: unknown) {
      // Error already logged and toasted by the hook
      console.error('[CREATE BLACKOUT] Failed:', error);
    }
  };

  return (
    <div className="flex flex-col admin-card relative select-none overflow-x-hidden">
      <InstructionalOverlay />
      <CalendarControls 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={typeFilter}
        onTypeChange={setTypeFilter}
        hideBlackouts={hideBlackouts}
        onHideBlackoutsChange={setHideBlackouts}
      />
      
      {campsites.length === 0 ? (
        <NoCampsitesCTA />
      ) : (
        <>
          {visibleBlackoutDates.length === 0 && filteredReservations.length === 0 && <EmptyStateHelper />}
          
          {selection && showCreationDialog && (
            <CreationDialog
              isOpen={showCreationDialog}
              onClose={() => {
                setShowCreationDialog(false);
                clearSelection();
              }}
              startDate={selection.start}
              endDate={selection.end}
              campsiteId={selection.campsiteId}
              campsiteCode={campsites.find(c => c.id === selection.campsiteId)?.code}
              onCreateBlackout={handleCreateBlackout}
              onCreateReservation={() => router.push(`/admin/reservations/new?start=${selection.start}&end=${selection.end}&campsite=${selection.campsiteId}`)}
            />
          )}
        </>
      )}

      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-6 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] gap-4">

        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] tracking-tight">
            {format(date, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1 bg-[var(--color-surface-elevated)] p-1 rounded-lg border border-[var(--color-border-subtle)] shadow-sm">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1.5 hover:bg-[var(--color-surface-card)] rounded-md transition-surface text-[var(--color-text-primary)] hover:text-[var(--color-accent-gold)]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleGoToToday}
              className="px-3 py-1 text-xs font-semibold hover:bg-[var(--color-surface-card)] hover:text-[var(--color-accent-gold)] rounded-md transition-surface text-[var(--color-text-primary)] border-x border-[var(--color-border-subtle)]"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1.5 hover:bg-[var(--color-surface-card)] rounded-md transition-surface text-[var(--color-text-primary)] hover:text-[var(--color-accent-gold)]"
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
          <div className="hidden xl:flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs">
            <Info size={14} className="text-[var(--color-accent-gold)] opacity-80" />
            <span>Drag to create reservation or blackout</span>
            <a 
              href="/admin/help?article=add-blackout-dates" 
              target="_blank" 
              className="ml-1 text-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)]/80 hover:underline font-medium transition-colors"
            >
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

      {/* Synced Top Scrollbar */}
      <SyncedScrollbar ref={slaveRef} contentWidth={contentWidth} className="z-[60] bg-transparent border-none -mb-3 relative scrollbar-hide" />

      {/* Grid Container - Horizontal Scroll Only */}
      <div className="relative overflow-hidden group/calendar">
        <div
          ref={scrollContainerRef}
          {...containerProps}
          className="calendar-hscroll overflow-x-auto overflow-y-visible relative select-none scrollbar-soft"
          style={{ touchAction: 'none' }}
          onPointerUp={handleCellPointerUp}
          onPointerCancel={handleCellPointerCancel}
          onPointerLeave={() => {
            if (isCreating) {
              clearSelection();
              stopAutoScroll(); // Stop scrolling when pointer leaves
            }
          }}
        >
          {/* Scroll Affordance Gradient */}
          <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-surface-card)] to-transparent pointer-events-none z-50 opacity-60 group-hover/calendar:opacity-20 transition-opacity" />
          
        <div ref={contentRef} className="inline-block min-w-full">
          {/* Header Row (Dates) */}
          <div 
            className={`flex sticky top-0 z-30 bg-[var(--color-surface-elevated)] border-b-2 border-[var(--color-border-strong)] ${headerProps.className}`}
            onPointerDown={headerProps.onPointerDown}
            onPointerMove={headerProps.onPointerMove}
            onPointerUp={headerProps.onPointerUp}
            onPointerCancel={headerProps.onPointerCancel}
            data-header-row="true"
          >
            {/* Corner Sticky */}
            <div 
                className="sticky left-0 w-32 sm:w-48 lg:w-64 bg-[var(--color-surface-elevated)] border-r border-[var(--color-border-default)] pt-5 pb-3 px-2 lg:px-3 font-semibold text-[var(--color-text-muted)] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] z-40 text-xs lg:text-sm"
                data-no-pan="true"
             >
              Campsite
            </div>
            {/* Days */}
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toString()}
                  ref={isToday(day) ? headerTodayRef : null}
                  className={`w-8 lg:w-10 xl:w-12 flex-shrink-0 text-center border-r border-[var(--color-border-default)] pt-5 pb-2 px-1 lg:px-2 text-xs
                    ${isWeekend(day) ? "bg-[var(--color-surface-elevated)]/50" : ""}
                    ${isToday(day) ? "bg-[var(--color-status-active)]/15 border-t-2 border-t-[var(--color-status-active)]" : ""}`}
                >
                  <div className="font-semibold text-[var(--color-text-primary)] text-[10px] lg:text-xs">{format(day, "d")}</div>
                  <div className="text-[var(--color-text-muted)] uppercase text-[8px] lg:text-[10px] hidden sm:block">{format(day, "EEEEE")}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Today Indicator Line */}
          {todayX !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-status-active)]/30 pointer-events-none z-10"
              style={{ left: `${todayX}px` }}
            />
          )}

          {/* Body Rows */}
          <div className="">
            {/* Unassigned Row */}
            {(() => {
              const unassignedReservations = filteredReservations.filter(
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
                      const isInSelection = isCreating && selection?.campsiteId === 'UNASSIGNED' && dayStr >= selection.start && dayStr <= selection.end;
                      const isDragHovered = isDragging && dragPreview?.campsiteId === 'UNASSIGNED' && dragPreview?.startDate === dayStr;

                      return (
                        <CalendarCell
                          key={day.toString()}
                          date={day}
                          resourceId="UNASSIGNED"
                          isWeekend={isWeekend(day)}
                          isToday={isToday(day)}
                          isOccupied={false}
                          isInSelection={isInSelection}
                          isDragHovered={isDragHovered}
                          showAvailability={showAvailability}
                          validationError={validationError}
                          baseBackgroundClass="bg-[var(--color-status-pending-bg)]/50"
                          onDragOver={handleDragOverCell}
                          onDrop={handleDrop}
                          onPointerDown={handleCellPointerDown}
                          onPointerEnter={handleCellPointerEnter}
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
                        isDragging={draggedItem?.id === res.id}
                        isResizing={resizeState?.item.id === res.id}
                      />
                    ))}

                    {/* Unified Ghost Preview */}
                    <GhostPreview
                      ghost={getGhost('UNASSIGNED')}
                      monthStart={monthStart}
                      monthEnd={monthEnd}
                      totalDays={totalDays}
                      label="Unassigned"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Campsite Rows */}
            {filteredCampsites.map((campsite) => {
              // Get reservations for this campsite
              const siteReservations = filteredReservations.filter(
                (r) => r.campsite_id === campsite.id || (r.campsites && r.campsites.code === campsite.code)
              );
              
              const siteBlackouts = visibleBlackoutDates.filter(
                (b) => b.campsite_id === campsite.id
              );

              // Styling for inactive campsites
              const isInactive = !campsite.is_active;
              const rowBgClass = isInactive ? 'bg-[var(--color-error)]/10' : '';
              const rowHoverClass = isInactive ? 'hover:bg-[var(--color-error)]/15' : 'hover:bg-[var(--color-surface-elevated)]/50';
              const stickyBgClass = isInactive ? 'bg-[var(--color-error)]/10 group-hover:bg-[var(--color-error)]/15' : 'bg-[var(--color-surface-card)] group-hover:bg-[var(--color-surface-elevated)]';

              return (
                <div key={campsite.id} data-campsite-id={campsite.id} className={`flex border-b border-[var(--color-border-subtle)] ${rowHoverClass} ${rowBgClass} transition-surface group relative ${isInactive ? 'border-[var(--color-error)]/30' : ''}`}>
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

                      // Check if this cell is in the creation selection range
                      const isInSelection = isCreating && selection?.campsiteId === campsite.id && dayStr >= selection.start && dayStr <= selection.end;

                      const isDragHovered = isDragging && dragPreview?.campsiteId === campsite.id && dragPreview?.startDate === dayStr;

                      return (
                        <CalendarCell
                          key={day.toString()}
                          date={day}
                          resourceId={campsite.id}
                          isWeekend={isWeekend(day)}
                          isToday={isToday(day)}
                          isOccupied={isOccupied}
                          isInSelection={isInSelection}
                          isDragHovered={isDragHovered}
                          showAvailability={showAvailability}
                          validationError={validationError}
                          onDragOver={handleDragOverCell}
                          onDrop={handleDrop}
                          onPointerDown={handleCellPointerDown}
                          onPointerEnter={handleCellPointerEnter}
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
                        isDragging={draggedItem?.id === res.id}
                        isResizing={resizeState?.item.id === res.id}
                        isGlobalDragging={isDragging}
                      />
                    ))}

                    {/* Blackout Dates as Interactive Blocks */}
                    {siteBlackouts.map((blackout) => (
                      <BlackoutBlock
                        key={blackout.id}
                        blackout={blackout}
                        monthStart={monthStart}
                        monthEnd={monthEnd}
                        onSelect={handleBlackoutClick}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onResizeStart={handleResizeStart}
                        isDragging={draggedItem?.id === blackout.id}
                        isResizing={resizeState?.item.id === blackout.id}
                        isGlobalDragging={isDragging}
                      />
                    ))}

                    {/* Unified Ghost Preview */}
                    <GhostPreview
                      ghost={getGhost(campsite.id)}
                      monthStart={monthStart}
                      monthEnd={monthEnd}
                      totalDays={totalDays}
                      label={campsite.code}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      <ReservationDrawer
        reservation={selectedReservation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <BlackoutDrawer
        blackout={selectedBlackout}
        campsiteName={selectedBlackout?.campsite_id ? (campsites.find(c => c.id === selectedBlackout.campsite_id)?.name || 'Unknown Site') : 'Unassigned'}
        isOpen={isBlackoutDrawerOpen}
        onClose={closeBlackoutDrawer}
        onUpdate={updateBlackout}
        onDelete={deleteBlackout}
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
          setConfirmDialogError(null);
        }}
        isSubmitting={isSubmitting}
        validationError={confirmDialogError}
      />
      
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] shadow-xl transition-all duration-300 ${showFloatingRail ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => {
            if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }}
          className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          title="Scroll to Start"
        >
          <ArrowLeftToLine size={18} />
        </button>
        <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-1" />
        <div 
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium text-sm cursor-pointer group"
          onClick={() => monthPickerRef.current?.showPicker()}
        >
          <CalendarIcon size={16} />
          <span className="whitespace-nowrap">{format(date, "MMMM yyyy")}</span>
          <input
            ref={monthPickerRef}
            type="month"
            className="absolute inset-0 opacity-0 pointer-events-none"
            value={format(date, 'yyyy-MM')}
            onChange={(e) => {
              if (e.target.value) {
                 const [y, m] = e.target.value.split('-').map(Number);
                 onDateChange(new Date(y, m - 1, 1));
              }
            }}
            tabIndex={-1}
            aria-label="Change Month"
          />
        </div>
        <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-1" />
        <button
          onClick={() => {
             if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
          }}
          className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => {
             if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
          }}
          className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <CalendarLegend />
    </div>
  );
}
