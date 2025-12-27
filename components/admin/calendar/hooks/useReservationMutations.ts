/**
 * useReservationMutations Hook
 *
 * Centralized reservation mutation logic with optimistic updates.
 * Handles reschedule operations with proper error handling and rollback.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Reservation } from '@/lib/supabase';
import type { CalendarData } from '@/lib/calendar/calendar-types';
import { useToast } from '@/components/ui/Toast';
import { calendarService } from '@/lib/calendar/calendar-service';
import { handleAdminError } from '@/lib/admin/error-handler';

interface UseReservationMutationsProps {
  onDataMutate?: (
    data?: CalendarData | Promise<CalendarData> | ((current: CalendarData | undefined) => CalendarData | Promise<CalendarData>),
    options?: { optimisticData?: CalendarData; rollbackOnError?: boolean; populateCache?: boolean; revalidate?: boolean }
  ) => Promise<CalendarData | undefined>;
}

export interface RescheduleParams {
  reservation: Reservation;
  newCampsiteId: string; // Can be 'UNASSIGNED'
  newStartDate: string;
  newEndDate: string;
}

export function useReservationMutations({ onDataMutate }: UseReservationMutationsProps) {
  const { showToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Reschedule a reservation (move to new campsite and/or dates)
   * Uses optimistic updates with automatic rollback on error
   */
  const rescheduleReservation = useCallback(async (params: RescheduleParams) => {
    // Fall back to reload if no mutate function provided
    if (!onDataMutate) {
      console.warn('[RESCHEDULE] No mutate function provided, falling back to reload');
      try {
        const campsiteId = params.newCampsiteId === 'UNASSIGNED' ? null : params.newCampsiteId;

        // Cancel previous request
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        const data = await calendarService.updateReservation(
          params.reservation.id!,
          {
            campsite_id: campsiteId,
            check_in: params.newStartDate,
            check_out: params.newEndDate,
          },
          abortControllerRef.current.signal
        );

        if (data.emailSent) {
          showToast('Reservation rescheduled successfully. Guest has been notified.', 'success');
        } else {
          showToast('Reservation rescheduled. Warning: Email notification failed.', 'warning');
        }

        setTimeout(() => window.location.reload(), 1500);
      } catch (error: unknown) {
        const adminError = handleAdminError(error, 'useReservationMutations.rescheduleReservation');
        throw adminError;
      }
      return;
    }

    try {
      // Convert 'UNASSIGNED' to null for API
      const campsiteId = params.newCampsiteId === 'UNASSIGNED' ? null : params.newCampsiteId;

      console.log('[RESCHEDULE] Optimistic update', {
        reservationId: params.reservation.id,
        from: {
          campsite: params.reservation.campsite_id,
          check_in: params.reservation.check_in,
          check_out: params.reservation.check_out
        },
        to: {
          campsite: campsiteId,
          check_in: params.newStartDate,
          check_out: params.newEndDate
        },
      });

      // Optimistic update with SWR
      const optimisticReservation = {
        ...params.reservation,
        campsite_id: campsiteId,
        check_in: params.newStartDate,
        check_out: params.newEndDate,
        _saving: true, // Visual feedback flag
      };

      // Get current data for optimistic update
      const currentData = await onDataMutate();
      if (!currentData) {
        console.error('[RESCHEDULE] No current data available');
        throw new Error('No current data available');
      }

      const optimisticData: CalendarData = {
        ...currentData,
        reservations: currentData.reservations.map(r =>
          r.id === params.reservation.id ? optimisticReservation : r
        ) as Reservation[],
      };

      await onDataMutate(
        async (current) => {
          if (!current) throw new Error('No current data');

          // Cancel previous request
          abortControllerRef.current?.abort();
          abortControllerRef.current = new AbortController();

          // Make API call using calendarService
          const { reservation: updatedReservation, emailSent } = await calendarService.updateReservation(
            params.reservation.id!,
            {
              campsite_id: campsiteId,
              check_in: params.newStartDate,
              check_out: params.newEndDate,
            },
            abortControllerRef.current.signal
          );

          console.log('[RESCHEDULE] Server confirmed:', updatedReservation);

          // Show success notification
          if (emailSent) {
            showToast('Reservation rescheduled successfully. Guest has been notified.', 'success');
          } else {
            showToast('Reservation rescheduled. Warning: Email notification failed.', 'warning');
          }

          // Return updated data without _saving flag
          return {
            ...current,
            reservations: current.reservations.map(r =>
              r.id === params.reservation.id ? updatedReservation : r
            ),
          };
        },
        {
          optimisticData,
          rollbackOnError: true,
          revalidate: false,
        }
      );
    } catch (error: unknown) {
      const adminError = handleAdminError(error, 'useReservationMutations.rescheduleReservation.optimistic');
      throw adminError;
    }
  }, [onDataMutate, showToast]);

  return {
    rescheduleReservation,
  };
}
