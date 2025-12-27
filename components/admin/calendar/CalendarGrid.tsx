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
import { ChevronLeft, ChevronRight, ArrowLeftToLine, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { handleAdminError } from "@/lib/admin/error-handler";
import InstructionalOverlay from "./InstructionalOverlay";
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
import BlackoutDrawer from "./BlackoutDrawer";
import NoCampsitesCTA from "./NoCampsitesCTA";
import CalendarMonthHeader from "./CalendarMonthHeader";
import CalendarDaysHeader from "./CalendarDaysHeader";
import CalendarRow from "./CalendarRow";
import { UI_CONSTANTS } from "@/lib/admin/constants";


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

  // Pre-calculate maps for stable references during drag operations
  const campsiteReservationsMap = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    filteredReservations.forEach(r => {
      if (r.campsite_id) {
        if (!map[r.campsite_id]) map[r.campsite_id] = [];
        map[r.campsite_id].push(r);
      }
    });
    return map;
  }, [filteredReservations]);

  const campsiteBlackoutMap = useMemo(() => {
    const map: Record<string, BlackoutDate[]> = {};
    const globalBlackouts = visibleBlackoutDates.filter(b => !b.campsite_id);
    
    visibleBlackoutDates.forEach(b => {
      if (b.campsite_id) {
        if (!map[b.campsite_id]) map[b.campsite_id] = [...globalBlackouts];
        map[b.campsite_id].push(b);
      }
    });

    // Handle global key for unassigned row or other references if needed
    map['GLOBAL'] = globalBlackouts;
    
    return map;
  }, [visibleBlackoutDates]);

  const unassignedReservations = useMemo(() => 
    filteredReservations.filter(r => !r.campsite_id), 
    [filteredReservations]
  );

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
       // Show when scrolled down past threshold
       setShowFloatingRail(window.scrollY > UI_CONSTANTS.FLOATING_RAIL_SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


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
    try {
      await updateBlackout(blackout.id, blackout.reason || '', {
        campsite_id: newCampsiteId === 'UNASSIGNED' ? null : newCampsiteId,
        start_date: newStartDate,
        end_date: newEndDate,
      });
    } catch (error: unknown) {
      handleAdminError(error, 'CalendarGrid.handleBlackoutDrop');
    }
  }, [updateBlackout]);

  // Drag and resize hook
  const {
    isDragging,
    draggedItem,
    dragPreview,
    resizeState,
    validationError,
    handleDragPointerDown,
    handleResizeStart,
    getGhost,
    getDragState,
  } = useDragResize({
    monthStart,
    monthEnd,
    campsites,
    reservations,
    blackoutDates,
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
      const adminError = handleAdminError(error, 'CalendarGrid.confirmReschedule');
      setConfirmDialogError(adminError.userMessage);
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
      handleAdminError(error, 'CalendarGrid.confirmCreation');
    }
  };

  return (
    <div className="flex flex-col admin-card relative select-none overflow-x-hidden">
      <InstructionalOverlay />
      {campsites.length === 0 ? (
        <NoCampsitesCTA />
      ) : (
        <>
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

      <CalendarMonthHeader
        date={date}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleGoToToday}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={typeFilter}
        onTypeChange={setTypeFilter}
        showAvailability={showAvailability}
        onShowAvailabilityChange={setShowAvailability}
      />

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
          <CalendarDaysHeader 
            days={days}
            todayX={todayX}
            onPointerDown={headerProps.onPointerDown}
            onPointerMove={headerProps.onPointerMove}
            onPointerUp={headerProps.onPointerUp}
            onPointerCancel={headerProps.onPointerCancel}
            headerTodayRef={headerTodayRef}
            className={headerProps.className}
          />

          {/* Today Indicator Line */}
          {todayX !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-status-active)]/30 pointer-events-none z-10"
              style={{ left: `${todayX}px` }}
            />
          )}

          {/* Rows Group */}
      <div className="flex flex-col select-none">
        {/* Unassigned Row */}
        <CalendarRow
          rowType="unassigned"
          reservations={unassignedReservations}
          blackoutDates={campsiteBlackoutMap['GLOBAL'] || []}
          days={days}
          monthStart={monthStart}
          monthEnd={monthEnd}
          totalDays={totalDays}
          isCreating={isCreating}
          selectionCampsiteId={selection?.campsiteId}
          selectionStart={selection?.start}
          selectionEnd={selection?.end}
          isDragging={isDragging}
          dragPreview={dragPreview}
          draggedItemId={draggedItem ? ('id' in draggedItem ? draggedItem.id : null) : null}
          resizeStateItemId={resizeState?.item ? ('id' in resizeState.item ? resizeState.item.id : null) : null}
          showAvailability={showAvailability}
          validationError={validationError}
          onCellPointerDown={handleCellPointerDown}
          onCellPointerEnter={handleCellPointerEnter}
          onReservationClick={handleReservationClick}
          onBlackoutClick={handleBlackoutClick}
          onDragStart={handleDragPointerDown}
          onResizeStart={handleResizeStart}
          getGhost={getGhost}
        />

        {/* Campsite Rows */}
        {filteredCampsites.map((campsite) => {
          // Pre-filtering in the loop is slightly inefficient but memoization is handled by the component.
          // However, .filter() returns a new array every time.
          // To fix this, we'd ideally pre-calculate a Map.
          const campsiteReservations = campsiteReservationsMap[campsite.id] || [];
          const campsiteBlackouts = campsiteBlackoutMap[campsite.id] || campsiteBlackoutMap['GLOBAL'] || [];
          // Actually, let's just use the combined one from the map if we want perfect stability.

          return (
            <CalendarRow
              key={campsite.id}
              rowType="campsite"
              campsite={campsite}
              reservations={campsiteReservations}
              blackoutDates={campsiteBlackouts}
              days={days}
              monthStart={monthStart}
              monthEnd={monthEnd}
              totalDays={totalDays}
              isCreating={isCreating}
              selectionCampsiteId={selection?.campsiteId}
              selectionStart={selection?.start}
              selectionEnd={selection?.end}
              isDragging={isDragging}
              dragPreview={dragPreview}
              draggedItemId={draggedItem ? ('id' in draggedItem ? draggedItem.id : null) : null}
              resizeStateItemId={resizeState?.item ? ('id' in resizeState.item ? resizeState.item.id : null) : null}
              showAvailability={showAvailability}
              validationError={validationError}
              onCellPointerDown={handleCellPointerDown}
              onCellPointerEnter={handleCellPointerEnter}
              onReservationClick={handleReservationClick}
              onBlackoutClick={handleBlackoutClick}
              onDragStart={handleDragPointerDown}
              onResizeStart={handleResizeStart}
              getGhost={getGhost}
            />
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
    </div>
  );
}
