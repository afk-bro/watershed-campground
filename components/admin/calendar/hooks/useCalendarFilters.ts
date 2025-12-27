import { useState, useMemo } from 'react';
import type { Campsite, Reservation, BlackoutDate } from '@/lib/supabase';

export interface UseCalendarFiltersReturn {
  // State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string | 'ALL';
  setTypeFilter: (filter: string | 'ALL') => void;
  hideBlackouts: boolean;
  setHideBlackouts: (hide: boolean) => void;

  // Filtered Data
  filteredCampsites: Campsite[];
  filteredReservations: Reservation[];
  visibleBlackoutDates: BlackoutDate[];
}

export interface UseCalendarFiltersParams {
  campsites: Campsite[];
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
}

/**
 * useCalendarFilters
 *
 * Manages all filtering state and logic for the calendar view.
 * Handles search queries, campsite type filtering, and blackout visibility.
 *
 * @param params - Unfiltered campsites, reservations, and blackout dates
 * @returns Filter state setters and memoized filtered data
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   typeFilter,
 *   setTypeFilter,
 *   filteredCampsites,
 *   filteredReservations
 * } = useCalendarFilters({ campsites, reservations, blackoutDates });
 * ```
 */
export function useCalendarFilters({
  campsites,
  reservations,
  blackoutDates
}: UseCalendarFiltersParams): UseCalendarFiltersReturn {
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | 'ALL'>("ALL");
  const [hideBlackouts, setHideBlackouts] = useState(false);

  // Filter campsites by type
  const filteredCampsites = useMemo(() => {
    if (typeFilter === 'ALL') return campsites;
    return campsites.filter(c => c.type === typeFilter);
  }, [campsites, typeFilter]);

  // Filter reservations by search query
  const filteredReservations = useMemo(() => {
    let result = reservations;

    // Filter by Search Query (guest name, ID, email)
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

  // Show/hide blackout dates based on toggle
  const visibleBlackoutDates = useMemo(() => {
    if (hideBlackouts) return [];
    return blackoutDates;
  }, [blackoutDates, hideBlackouts]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    hideBlackouts,
    setHideBlackouts,

    // Filtered Data
    filteredCampsites,
    filteredReservations,
    visibleBlackoutDates
  };
}
