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
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
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
import CalendarControls from "./CalendarControls";
import BlackoutDrawer from "./BlackoutDrawer";
import CalendarLegend from "./CalendarLegend";

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

  // Blackout Manager Hook
  const {
      selectedBlackout,
      isBlackoutDrawerOpen,
      openDrawer: openBlackoutDrawer,
      closeDrawer: closeBlackoutDrawer,
      updateBlackout,
      deleteBlackout
  } = useBlackoutManager({ onDataMutate });

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

  // Calendar selection hook (after drag/resize so we can check their state)
  const {
    isCreating,
    creationStart,
    creationEnd,
    selection,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp: handleCellMouseUpBase,
    clearSelection,
  } = useCalendarSelection(!isDragging && !resizeState);

  // Wrap handleCellMouseUp to also show dialog
  const handleCellMouseUp = useCallback(() => {
    handleCellMouseUpBase();
    if (isCreating && creationStart && creationEnd) {
      setShowCreationDialog(true);
    }
  }, [handleCellMouseUpBase, isCreating, creationStart, creationEnd]);

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

    } catch (error: unknown) {
      console.error('Reschedule error:', error);
      // Show error in dialog, keep it open for retry
      setConfirmDialogError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-scroll during creation drag
  const handleCreationMouseMove = useCallback((e: MouseEvent) => {
    if (!isCreating) return;
    updateScrollDirection(e.clientX, e.clientY);
  }, [isCreating, updateScrollDirection]);

  // Add/remove window mouse listeners for creation drag
  useEffect(() => {
    if (isCreating) {
      console.log('[CREATION] Setting up mousemove listener for auto-scroll');
      window.addEventListener('mousemove', handleCreationMouseMove);
      return () => {
        console.log('[CREATION] Removing mousemove listener');
        window.removeEventListener('mousemove', handleCreationMouseMove);
        stopAutoScroll(); // Stop any active scrolling
      };
    }
  }, [isCreating, handleCreationMouseMove, stopAutoScroll]);

  const handleCreateBlackout = async (reason: string) => {
    if (!creationStart || !creationEnd) return;

    // Ensure start is before end
    let start = creationStart.date;
    let end = creationEnd.date;
    if (start > end) {
      [start, end] = [end, start];
    }
    
    // Check if we have a valid campsite ID
    if (!creationStart.campsiteId || creationStart.campsiteId === 'UNASSIGNED') {
        showToast('Cannot create blackout on Unassigned row', 'error');
        return;
    }

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

  return (
    <div className="flex flex-col admin-card relative select-none">
      <InstructionalOverlay />
      <CalendarControls 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={typeFilter}
        onTypeChange={setTypeFilter}
        hideBlackouts={hideBlackouts}
        onHideBlackoutsChange={setHideBlackouts}
      />
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
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-heading font-bold text-[var(--color-text-primary)]">
            {format(date, "MMMM yyyy")}
          </h2>
          <div className="flex items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-sm">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1.5 hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-r border-[var(--color-border-strong)] transition-surface"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
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

      {/* Grid Container - Horizontal Scroll Only */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-visible relative"
        onMouseUp={handleCellMouseUp}
        onMouseLeave={() => {
           if (isCreating) {
             clearSelection();
             stopAutoScroll(); // Stop scrolling when mouse leaves
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
                          onMouseDown={handleCellMouseDown}
                          onMouseEnter={handleCellMouseEnter}
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
                          onMouseDown={handleCellMouseDown}
                          onMouseEnter={handleCellMouseEnter}
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
      
      <CalendarLegend />
    </div>
  );
}
