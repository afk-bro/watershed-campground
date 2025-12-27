"use client";

import { useMemo, useState } from 'react';
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Campsite, Reservation, BlackoutDate } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, Tent } from 'lucide-react';

interface AgendaViewProps {
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  date: Date;
  onDateChange: (date: Date) => void;
  onReservationClick?: (reservation: Reservation) => void;
}

interface DayEvent {
  type: 'reservation' | 'blackout' | 'checkout' | 'checkin';
  reservation?: Reservation;
  blackout?: BlackoutDate;
  campsite?: Campsite;
  isStart?: boolean;
  isEnd?: boolean;
}

export default function AgendaView({
  campsites,
  reservations,
  blackoutDates,
  date,
  onDateChange,
  onReservationClick,
}: AgendaViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Generate events for each day in the month
  const dailyEvents = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const eventsMap = new Map<string, DayEvent[]>();

    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const events: DayEvent[] = [];

      // Check-ins (reservations starting this day)
      reservations.forEach(res => {
        const checkIn = new Date(res.check_in);
        const checkOut = new Date(res.check_out);
        const campsite = campsites.find(c => c.id === res.campsite_id);

        if (isSameDay(checkIn, day)) {
          events.push({
            type: 'checkin',
            reservation: res,
            campsite,
            isStart: true,
          });
        }

        // Check-outs (reservations ending this day)
        if (isSameDay(checkOut, day)) {
          events.push({
            type: 'checkout',
            reservation: res,
            campsite,
            isEnd: true,
          });
        }

        // Ongoing stays (between check-in and check-out)
        if (day > checkIn && day < checkOut) {
          events.push({
            type: 'reservation',
            reservation: res,
            campsite,
          });
        }
      });

      // Blackout dates
      blackoutDates.forEach(blackout => {
        const start = new Date(blackout.start_date);
        const end = addDays(new Date(blackout.end_date), 1); // end_date is inclusive

        if (day >= start && day < end) {
          events.push({
            type: 'blackout',
            blackout,
          });
        }
      });

      if (events.length > 0) {
        eventsMap.set(dayKey, events);
      }
    });

    return eventsMap;
  }, [date, reservations, blackoutDates, campsites]);

  // Get array of days with events
  const daysWithEvents = useMemo(() => {
    return Array.from(dailyEvents.entries())
      .map(([dayKey, events]) => ({
        date: new Date(dayKey),
        dayKey,
        events,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [dailyEvents]);

  const handlePrevMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between gap-4 bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg p-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[var(--color-accent-gold)]" />
          <h2 className="text-xl font-heading font-bold text-[var(--color-text-primary)]">
            {format(date, 'MMMM yyyy')}
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
            onClick={handleNextMonth}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
        </div>
      </div>

      {/* Events list */}
      {daysWithEvents.length === 0 ? (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-secondary)]">
            No events scheduled for {format(date, 'MMMM yyyy')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {daysWithEvents.map(({ date: dayDate, dayKey, events }) => {
            const isExpanded = expandedDay === dayKey;
            const isToday = isSameDay(dayDate, new Date());

            return (
              <div
                key={dayKey}
                className={`bg-[var(--color-surface-elevated)] border rounded-lg overflow-hidden transition-all ${
                  isToday
                    ? 'border-[var(--color-accent-gold)]'
                    : 'border-[var(--color-border-default)]'
                }`}
              >
                {/* Day header */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-center ${isToday ? 'text-[var(--color-accent-gold)]' : ''}`}>
                      <div className="text-2xl font-bold leading-none">
                        {format(dayDate, 'd')}
                      </div>
                      <div className="text-xs uppercase">
                        {format(dayDate, 'EEE')}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-[var(--color-border-default)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {events.length} {events.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Events for this day */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border-default)] divide-y divide-[var(--color-border-default)]">
                    {events.map((event, idx) => (
                      <div
                        key={idx}
                        className={`p-4 ${
                          event.reservation && onReservationClick
                            ? 'cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors'
                            : ''
                        }`}
                        onClick={() => {
                          if (event.reservation && onReservationClick) {
                            onReservationClick(event.reservation);
                          }
                        }}
                      >
                        {event.type === 'blackout' && event.blackout ? (
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-500/20 rounded">
                              <Calendar className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-red-400">
                                Blackout Period
                              </div>
                              <div className="text-sm text-[var(--color-text-secondary)]">
                                {event.blackout.reason || 'Unavailable'}
                              </div>
                            </div>
                          </div>
                        ) : event.reservation ? (
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded ${
                                event.type === 'checkin'
                                  ? 'bg-green-500/20'
                                  : event.type === 'checkout'
                                  ? 'bg-blue-500/20'
                                  : 'bg-gray-500/20'
                              }`}
                            >
                              <Tent className={`w-4 h-4 ${
                                event.type === 'checkin'
                                  ? 'text-green-400'
                                  : event.type === 'checkout'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {event.type === 'checkin' && (
                                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                                    Check-in
                                  </span>
                                )}
                                {event.type === 'checkout' && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                                    Check-out
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(event.reservation.status)}`}>
                                  {event.reservation.status}
                                </span>
                              </div>
                              <div className="font-medium text-[var(--color-text-primary)]">
                                {event.reservation.first_name} {event.reservation.last_name}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-[var(--color-text-secondary)]">
                                {event.campsite && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.campsite.name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {event.reservation.adults}
                                  {event.reservation.children > 0 && ` + ${event.reservation.children}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
