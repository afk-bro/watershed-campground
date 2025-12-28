import { useState, useEffect, useRef } from 'react';

/**
 * useTodayIndicator
 *
 * Manages the position of the "today" indicator line in the calendar.
 * Calculates the X offset of the today column for the vertical indicator line.
 *
 * @param date - Current month being displayed
 * @param campsitesCount - Number of campsites (affects layout)
 * @returns Object with todayX position and headerTodayRef to attach to today's date header
 */
export function useTodayIndicator(date: Date, campsitesCount: number) {
  const [todayX, setTodayX] = useState<number | null>(null);
  const headerTodayRef = useRef<HTMLDivElement>(null);

  // Sync today position when month changes or campsite list changes
  useEffect(() => {
    if (headerTodayRef.current) {
      setTodayX(headerTodayRef.current.offsetLeft);
    } else {
      setTodayX(null);
    }
  }, [date, campsitesCount]);

  return { todayX, headerTodayRef };
}
