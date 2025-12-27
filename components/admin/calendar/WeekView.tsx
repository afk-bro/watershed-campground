"use client";

import { useMemo, useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import type { Campsite, Reservation, BlackoutDate } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface WeekViewProps {
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  date: Date;
  onDateChange: (date: Date) => void;
  onReservationClick?: (reservation: Reservation) => void;
  canDragMove?: boolean;
}

export default function WeekView({
  campsites,
  reservations,
  blackoutDates,
  date,
  onDateChange,
  onReservationClick,
  canDragMove = false,
}: WeekViewProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    startOfWeek(date, { weekStartsOn: 0 }) // Sunday
  );

  // Generate 7 days for the current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
  }, [selectedWeekStart]);

  // Group reservations by campsite
  const reservationsByCampsite = useMemo(() => {
    const map = new Map<string, Reservation[]>();

    campsites.forEach(campsite => {
      const siteReservations = reservations.filter(
        res => res.campsite_id === campsite.id
      );
      map.set(campsite.id, siteReservations);
    });

    return map;
  }, [campsites, reservations]);

  // Check if a reservation overlaps with a specific day
  const isReservationOnDay = (reservation: Reservation, day: Date): boolean => {
    const checkIn = new Date(reservation.check_in);
    const checkOut = new Date(reservation.check_out);
    return day >= checkIn && day < checkOut;
  };

  // Get reservation for a specific campsite and day
  const getReservationForDay = (campsiteId: string, day: Date): Reservation | null => {
    const siteReservations = reservationsByCampsite.get(campsiteId) || [];
    return siteReservations.find(res => isReservationOnDay(res, day)) || null;
  };

  // Check if day has blackout
  const hasBlackout = (campsiteId: string, day: Date): boolean => {
    return blackoutDates.some(blackout => {
      if (blackout.campsite_id && blackout.campsite_id !== campsiteId) return false;
      const start = new Date(blackout.start_date);
      const end = addDays(new Date(blackout.end_date), 1); // end_date is inclusive
      return day >= start && day < end;
    });
  };

  const handlePrevWeek = () => {
    const newStart = subWeeks(selectedWeekStart, 1);
    setSelectedWeekStart(newStart);
    onDateChange(newStart);
  };

  const handleNextWeek = () => {
    const newStart = addWeeks(selectedWeekStart, 1);
    setSelectedWeekStart(newStart);
    onDateChange(newStart);
  };

  const handleToday = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    setSelectedWeekStart(weekStart);
    onDateChange(today);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-600 border-green-500';
      case 'pending':
        return 'bg-yellow-600 border-yellow-500';
      case 'cancelled':
        return 'bg-red-600 border-red-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  const today = new Date();
  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 });

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between gap-4 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg p-4">
        <button
          onClick={handlePrevWeek}
          className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[var(--color-accent-gold)]" />
          <h2 className="text-lg sm:text-xl font-heading font-bold text-[var(--color-text-primary)]">
            {format(selectedWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm bg-[var(--color-surface-hover)] hover:bg-[var(--color-accent-gold)] hover:text-[var(--color-brand-forest)] rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
          <div className="p-2 sm:p-3 text-xs font-medium text-[var(--color-text-secondary)] border-r border-[var(--color-border-default)]">
            Site
          </div>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                className={`p-2 sm:p-3 text-center ${
                  i < 6 ? 'border-r border-[var(--color-border-default)]' : ''
                } ${isToday ? 'bg-[var(--color-accent-gold)]/10' : ''}`}
              >
                <div className={`text-xs uppercase ${isToday ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)]'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-primary)]'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Campsite rows */}
        <div className="divide-y divide-[var(--color-border-default)]">
          {campsites.map((campsite) => (
            <div key={campsite.id} className="grid grid-cols-8">
              {/* Campsite name */}
              <div className="p-2 sm:p-3 border-r border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {campsite.name}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] truncate">
                  {campsite.type}
                </div>
              </div>

              {/* Days */}
              {weekDays.map((day, dayIdx) => {
                const reservation = getReservationForDay(campsite.id, day);
                const hasBlackoutDate = hasBlackout(campsite.id, day);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={dayIdx}
                    className={`p-1 sm:p-2 min-h-[60px] ${
                      dayIdx < 6 ? 'border-r border-[var(--color-border-default)]' : ''
                    } ${isToday ? 'bg-[var(--color-accent-gold)]/5' : ''} ${
                      reservation || hasBlackoutDate ? '' : 'hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    {hasBlackoutDate ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-full p-1.5 bg-red-500/20 border border-red-500/30 rounded text-center">
                          <span className="text-[10px] text-red-400 font-medium">
                            Blocked
                          </span>
                        </div>
                      </div>
                    ) : reservation ? (
                      <button
                        onClick={() => onReservationClick?.(reservation)}
                        className={`w-full h-full p-1.5 rounded border text-left transition-all hover:brightness-110 hover:shadow-sm ${getStatusColor(
                          reservation.status
                        )} ${canDragMove ? 'cursor-move' : 'cursor-pointer'}`}
                        title={`${reservation.first_name} ${reservation.last_name}`}
                      >
                        <div className="text-[10px] sm:text-xs font-medium text-white truncate">
                          {reservation.first_name} {reservation.last_name.charAt(0)}.
                        </div>
                        <div className="text-[9px] text-white/80 truncate">
                          {reservation.adults}
                          {reservation.children > 0 && `+${reservation.children}`} guests
                        </div>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Drag hint */}
      {canDragMove && (
        <div className="text-xs text-[var(--color-text-muted)] text-center">
          Drag reservations to move them (mouse/trackpad only)
        </div>
      )}
    </div>
  );
}
