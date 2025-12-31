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
import { logger } from "@/lib/logger";

interface UseStuckSavingFailsafeProps {
  reservations: (Reservation & { _saving?: boolean })[];
  blackoutDates: (BlackoutDate & { _saving?: boolean })[];
  onRevalidate?: () => void;
}

// Configurable timeout with safeguards (default 10s, min 100ms to prevent instant triggers)
const FAILSAFE_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_STUCK_SAVING_TIMEOUT_MS ?? 10_000);
const STUCK_TIMEOUT_MS = Number.isFinite(FAILSAFE_TIMEOUT_MS) && FAILSAFE_TIMEOUT_MS >= 100
  ? FAILSAFE_TIMEOUT_MS
  : 10_000;

export function useStuckSavingFailsafe({
  reservations,
  blackoutDates,
  onRevalidate,
}: UseStuckSavingFailsafeProps) {
  const { showToast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Stable refs for callbacks to prevent effect re-runs when identity changes
  const onRevalidateRef = useRef(onRevalidate);
  const showToastRef = useRef(showToast);
  useEffect(() => {
    onRevalidateRef.current = onRevalidate;
    showToastRef.current = showToast;
  }, [onRevalidate, showToast]);

  // Main effect: manage timeouts for saving items
  // Only depends on data arrays, not callbacks (read from refs)
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
          logger.error('[STUCK SAVING] Reservation stuck saving for 10s:', undefined, { reservationId: r.id });
          showToastRef.current('Still saving... Syncing with server.', 'warning');

          // Auto-revalidate to sync reality
          if (onRevalidateRef.current) {
            onRevalidateRef.current();
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
          logger.error('[STUCK SAVING] Blackout stuck saving for 10s:', undefined, { blackoutId: b.id });
          showToastRef.current('Still saving... Syncing with server.', 'warning');

          // Auto-revalidate to sync reality
          if (onRevalidateRef.current) {
            onRevalidateRef.current();
          }

          timeouts.delete(key);
        }, STUCK_TIMEOUT_MS);

        timeouts.set(key, timeout);
      }
    });

    // Clear timers for items that finished saving (surgical cleanup)
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

    // Note: NO cleanup return here - we only clear individual timeouts above
    // Unmount cleanup is handled by a separate effect below
  }, [reservations, blackoutDates]); // Removed callback deps - read from refs

  // Separate unmount-only cleanup to prevent timeout churn
  // This runs ONLY on unmount, not on every dependency change
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []); // Empty deps = unmount only
}
