/**
 * Stuck Saving Failsafe Hook
 *
 * Prevents worst-case UX where _saving flag gets stuck indefinitely due to:
 * - Network request hanging (network limbo)
 * - Tab sleeping mid-request
 * - Exception after optimistic commit but before final commit
 *
 * Strategy:
 * - Track items with _saving flag
 * - Set 10-second timeout for each saving item
 * - On timeout: show toast + auto-revalidate to sync with server
 * - Clear timeout when item completes saving
 */

import { useEffect, useRef } from 'react';
import { Reservation, BlackoutDate } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

interface UseStuckSavingFailsafeProps {
  reservations: (Reservation & { _saving?: boolean })[];
  blackoutDates: (BlackoutDate & { _saving?: boolean })[];
  onRevalidate?: () => void;
}

const STUCK_TIMEOUT_MS = 10000; // 10 seconds

export function useStuckSavingFailsafe({
  reservations,
  blackoutDates,
  onRevalidate,
}: UseStuckSavingFailsafeProps) {
  const { showToast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const timeouts = timeoutsRef.current;

    // Find all items currently saving
    const savingReservations = reservations.filter(r => r._saving && r.id);
    const savingBlackouts = blackoutDates.filter(b => b._saving && b.id);

    // Start timers for new saving items
    savingReservations.forEach(r => {
      const key = `reservation-${r.id}`;
      if (!timeouts.has(key)) {
        const timeout = setTimeout(() => {
          console.error('[STUCK SAVING] Reservation stuck saving for 10s:', r.id);
          showToast('Still saving... Syncing with server.', 'warning');

          // Auto-revalidate to sync reality
          if (onRevalidate) {
            onRevalidate();
          }

          timeouts.delete(key);
        }, STUCK_TIMEOUT_MS);

        timeouts.set(key, timeout);
      }
    });

    savingBlackouts.forEach(b => {
      const key = `blackout-${b.id}`;
      if (!timeouts.has(key)) {
        const timeout = setTimeout(() => {
          console.error('[STUCK SAVING] Blackout stuck saving for 10s:', b.id);
          showToast('Still saving... Syncing with server.', 'warning');

          // Auto-revalidate to sync reality
          if (onRevalidate) {
            onRevalidate();
          }

          timeouts.delete(key);
        }, STUCK_TIMEOUT_MS);

        timeouts.set(key, timeout);
      }
    });

    // Clear timers for items that finished saving
    const currentSavingIds = new Set([
      ...savingReservations.map(r => `reservation-${r.id}`),
      ...savingBlackouts.map(b => `blackout-${b.id}`)
    ]);

    timeouts.forEach((timeout, key) => {
      if (!currentSavingIds.has(key)) {
        clearTimeout(timeout);
        timeouts.delete(key);
      }
    });

    // Cleanup on unmount
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, [reservations, blackoutDates, onRevalidate, showToast]);
}
