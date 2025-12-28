import { useState, useCallback } from 'react';
import type { Reservation, Campsite } from '@/lib/supabase';
import { handleAdminError } from '@/lib/admin/error-handler';

export interface UseRescheduleWorkflowParams {
  /** Campsites for name lookup in dialog */
  campsites: Campsite[];
  /** Reschedule mutation function */
  rescheduleReservation: (params: {
    reservation: Reservation;
    newCampsiteId: string;
    newStartDate: string;
    newEndDate: string;
  }) => Promise<void>;
}

export interface UseRescheduleWorkflowReturn {
  // State
  pendingMove: {
    reservation: Reservation;
    newCampsiteId: string;
    newStartDate: string;
    newEndDate: string;
  } | null;
  showConfirmDialog: boolean;
  isSubmitting: boolean;
  confirmDialogError: string | null;

  // Handlers
  handleMoveRequested: (
    reservation: Reservation,
    newCampsiteId: string,
    newStartDate: string,
    newEndDate: string
  ) => void;
  handleConfirmReschedule: () => Promise<void>;
  handleCancelReschedule: () => void;

  // Dialog Props Helpers
  getDialogProps: () => {
    oldCampsiteName: string;
    newCampsiteName: string;
    oldStartDate: string;
    oldEndDate: string;
    newStartDate: string;
    newEndDate: string;
  };
}

/**
 * useRescheduleWorkflow
 *
 * Manages the complete reschedule confirmation workflow:
 * - Captures move request from drag/resize
 * - Shows confirmation dialog with details
 * - Handles submission with error recovery
 * - Manages dialog lifecycle (open → submit → close)
 *
 * @param params - Campsites and reschedule mutation function
 * @returns Workflow state, handlers, and dialog prop helpers
 */
export function useRescheduleWorkflow({
  campsites,
  rescheduleReservation
}: UseRescheduleWorkflowParams): UseRescheduleWorkflowReturn {
  // Workflow State
  const [pendingMove, setPendingMove] = useState<{
    reservation: Reservation;
    newCampsiteId: string;
    newStartDate: string;
    newEndDate: string;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogError, setConfirmDialogError] = useState<string | null>(null);

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

  // Handle confirmation submission
  const handleConfirmReschedule = useCallback(async () => {
    if (!pendingMove) return;

    setIsSubmitting(true);
    setConfirmDialogError(null);

    try {
      await rescheduleReservation({
        reservation: pendingMove.reservation,
        newCampsiteId: pendingMove.newCampsiteId,
        newStartDate: pendingMove.newStartDate,
        newEndDate: pendingMove.newEndDate,
      });

      // Close dialog on success
      setShowConfirmDialog(false);
      setPendingMove(null);
      setConfirmDialogError(null);
    } catch (error: unknown) {
      // Show error in dialog, keep it open for retry
      const adminError = handleAdminError(error, 'useRescheduleWorkflow.confirmReschedule');
      setConfirmDialogError(adminError.userMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingMove, rescheduleReservation]);

  // Handle cancellation
  const handleCancelReschedule = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingMove(null);
    setConfirmDialogError(null);
  }, []);

  // Helper to get dialog props (campsite name lookups)
  const getDialogProps = useCallback(() => {
    if (!pendingMove) {
      return {
        oldCampsiteName: 'Unassigned',
        newCampsiteName: 'Unassigned',
        oldStartDate: '',
        oldEndDate: '',
        newStartDate: '',
        newEndDate: '',
      };
    }

    return {
      oldCampsiteName: pendingMove.reservation.campsite_id
        ? campsites.find(c => c.id === pendingMove.reservation.campsite_id)?.name || 'Unassigned'
        : 'Unassigned',
      newCampsiteName: pendingMove.newCampsiteId === 'UNASSIGNED'
        ? 'Unassigned'
        : campsites.find(c => c.id === pendingMove.newCampsiteId)?.name || 'Unassigned',
      oldStartDate: pendingMove.reservation.check_in || '',
      oldEndDate: pendingMove.reservation.check_out || '',
      newStartDate: pendingMove.newStartDate || '',
      newEndDate: pendingMove.newEndDate || '',
    };
  }, [pendingMove, campsites]);

  return {
    // State
    pendingMove,
    showConfirmDialog,
    isSubmitting,
    confirmDialogError,

    // Handlers
    handleMoveRequested,
    handleConfirmReschedule,
    handleCancelReschedule,

    // Dialog Props Helpers
    getDialogProps,
  };
}
