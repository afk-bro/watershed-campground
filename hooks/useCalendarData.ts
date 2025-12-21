/**
 * useCalendarData - SWR hook for fetching calendar data
 *
 * Provides optimistic updates and automatic revalidation for:
 * - Reservations
 * - Campsites
 * - Blackout dates
 */

import useSWR from 'swr';
import { format } from 'date-fns';
import type { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';

interface CalendarData {
  reservations: Reservation[];
  campsites: Campsite[];
  blackoutDates: BlackoutDate[];
}

const fetcher = async (url: string): Promise<CalendarData> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch calendar data');
  }

  const data = await response.json();
  return {
    reservations: data.reservations || [],
    campsites: data.campsites || [],
    blackoutDates: data.blackoutDates || [],
  };
};

export interface UseCalendarDataReturn {
  /** Calendar data (reservations, campsites, blackoutDates) */
  data: CalendarData | undefined;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | undefined;

  /** Revalidate data */
  revalidate: () => Promise<CalendarData | undefined>;

  /**
   * Mutate data with optimistic updates
   * @param data - New data or updater function
   * @param options - SWR mutate options
   */
  mutate: (
    data?: CalendarData | Promise<CalendarData> | ((current: CalendarData | undefined) => CalendarData | Promise<CalendarData>),
    options?: { optimisticData?: CalendarData; rollbackOnError?: boolean; populateCache?: boolean; revalidate?: boolean }
  ) => Promise<CalendarData | undefined>;
}

/**
 * Hook for fetching calendar data with SWR
 *
 * @param date - The month to fetch data for
 * @returns Calendar data with optimistic update support
 *
 * @example
 * const { data, mutate, isLoading, error } = useCalendarData(currentDate);
 *
 * // Optimistic update for blackout move
 * await mutate(
 *   async (current) => {
 *     const updated = {
 *       ...current,
 *       blackoutDates: current.blackoutDates.map(b =>
 *         b.id === id ? { ...b, start_date, end_date } : b
 *       )
 *     };
 *
 *     await fetch(`/api/admin/blackout-dates/${id}`, { ... });
 *     return updated;
 *   },
 *   { rollbackOnError: true }
 * );
 */
export function useCalendarData(date: Date): UseCalendarDataReturn {
  const monthStr = format(date, 'yyyy-MM');
  const url = `/api/admin/calendar?month=${monthStr}`;

  const { data, error, isLoading, mutate } = useSWR<CalendarData>(
    url,
    fetcher,
    {
      // Revalidate on focus (user switches tabs)
      revalidateOnFocus: true,

      // Revalidate on reconnect
      revalidateOnReconnect: true,

      // Don't revalidate on mount if data exists (performance)
      revalidateIfStale: false,

      // Keep previous data while revalidating
      keepPreviousData: true,

      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  );

  return {
    data,
    isLoading,
    error,
    revalidate: () => mutate(),
    mutate,
  };
}
