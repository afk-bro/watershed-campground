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
import { useToast } from "@/components/ui/Toast";
import { handleAdminError } from "@/lib/admin/error-handler";
import InstructionalOverlay from "./InstructionalOverlay";
import CreationDialog from "./CreationDialog";
import { useRouter } from "next/navigation";
import type { GhostState, CalendarData } from "@/lib/calendar/calendar-types";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { useDragResize } from "./hooks/useDragResize";
import { useBlackoutManager } from "./hooks/useBlackoutManager";
import { useCalendarPanning } from "./hooks/useCalendarPanning";
import { useSyncedScroll } from "./hooks/useSyncedScroll";
import { useStuckSavingFailsafe } from "./hooks/useStuckSavingFailsafe";
import { useReservationMutations } from "./hooks/useReservationMutations";
import { useCalendarFilters } from "./hooks/useCalendarFilters";
import { useCreationWorkflow } from "./hooks/useCreationWorkflow";
import { useRescheduleWorkflow } from "./hooks/useRescheduleWorkflow";
import SyncedScrollbar from "./SyncedScrollbar";
import BlackoutDrawer from "./BlackoutDrawer";
import NoCampsitesCTA from "./NoCampsitesCTA";
import CalendarMonthHeader from "./CalendarMonthHeader";
import CalendarDaysHeader from "./CalendarDaysHeader";
import CalendarRow from "./CalendarRow";
import FloatingCalendarRail from "./FloatingCalendarRail";
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

  // Filter State & Logic
  const {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    hideBlackouts,
    setHideBlackouts,
    filteredCampsites,
    filteredReservations,
    visibleBlackoutDates
  } = useCalendarFilters({ campsites, reservations, blackoutDates });

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

  // Reschedule Workflow (confirmation dialog and submission)
  const {
    pendingMove,
    showConfirmDialog,
    isSubmitting,
    confirmDialogError,
    handleMoveRequested,
    handleConfirmReschedule,
    handleCancelReschedule,
    getDialogProps
  } = useRescheduleWorkflow({ campsites, rescheduleReservation });

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
  const [contentWidth, setContentWidth] = useState(0);

  // Measure content width for synced scrollbar
  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.scrollWidth);
    }
  }, [days.length, campsites.length, reservations.length]);


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

  // Creation Workflow (selection, dialog, and blackout creation)
  const {
    isCreating,
    selection,
    creationStart,
    creationEnd,
    showCreationDialog,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerUp,
    handleCellPointerCancel,
    handleCreateBlackout,
    clearSelection
  } = useCreationWorkflow({
    isDragging,
    resizeState,
    reservations,
    blackoutDates,
    updateScrollDirection,
    stopAutoScroll,
    createBlackout
  });
  
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
              onClose={clearSelection}
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
        {...getDialogProps()}
        onConfirm={handleConfirmReschedule}
        onCancel={handleCancelReschedule}
        isSubmitting={isSubmitting}
        validationError={confirmDialogError}
      />

      <FloatingCalendarRail
        date={date}
        onDateChange={onDateChange}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
}
