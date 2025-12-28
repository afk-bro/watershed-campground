"use client";

import { useState } from "react";
import type React from "react";
import { useToast } from "@/components/ui/Toast";
import { adminAPI } from "@/lib/admin/api-client";
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/lib/admin/constants";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface UseBulkActionsOptions {
  onSuccess?: () => void | Promise<void>;
}

interface UseBulkActionsReturn {
  isSubmitting: boolean;
  handleBulkAction: (
    action: "check_in" | "check_out" | "cancel",
    selectedIds: Set<string>
  ) => Promise<void>;
  handleBulkAssignRandom: (selectedIds: Set<string>) => Promise<void>;
  handleBulkArchive: (
    action: "archive" | "restore",
    selectedIds: Set<string>
  ) => Promise<void>;
  handleArchive: (reservationId: string) => Promise<void>;
  handleDeleteMaintenance: (maintenanceId: string) => Promise<void>;
  ConfirmDialogComponent: React.ReactElement;
}

/**
 * useBulkActions - Custom hook for bulk reservation operations
 *
 * Handles bulk status updates, assignments, archiving, and maintenance deletion.
 * Manages loading states, confirmation dialogs, and toast notifications.
 *
 * @param options - Configuration options
 * @param options.onSuccess - Callback to run after successful operations (e.g., refetch data)
 *
 * @returns Bulk action handlers and loading state
 *
 * @example
 * ```tsx
 * const { handleBulkAction, isSubmitting } = useBulkActions({
 *   onSuccess: refetch
 * });
 * ```
 */
export function useBulkActions({
  onSuccess,
}: UseBulkActionsOptions = {}): UseBulkActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleBulkAction = async (
    action: "check_in" | "check_out" | "cancel",
    selectedIds: Set<string>
  ) => {
    if (isSubmitting) return;

    const confirmed = await showConfirm({
      title: "Process Reservations",
      message: `Process ${selectedIds.size} reservations?`,
      confirmLabel: "Process",
      variant: "info"
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await adminAPI.bulkUpdateStatus(Array.from(selectedIds), action);
      await onSuccess?.();
      showToast(`${selectedIds.size} reservations updated`, "success");
    } catch (error) {
      console.error("[useBulkActions] Bulk action failed:", error);
      showToast(ERROR_MESSAGES.BULK_ACTION_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAssignRandom = async (selectedIds: Set<string>) => {
    if (isSubmitting) return;

    const confirmed = await showConfirm({
      title: "Auto-Assign Campsites",
      message: `Auto-assign ${selectedIds.size} reservations to available campsites?`,
      confirmLabel: "Auto-Assign",
      variant: "info"
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const data = await adminAPI.bulkAssignRandom(Array.from(selectedIds));
      const successCount = (data.results || []).filter(
        (r) => r.success
      ).length;

      await onSuccess?.();
      showToast(`Assigned ${successCount} reservations.`, "success");
    } catch (error) {
      console.error("[useBulkActions] Bulk assign failed:", error);
      showToast(ERROR_MESSAGES.BULK_ASSIGN_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkArchive = async (
    action: "archive" | "restore",
    selectedIds: Set<string>
  ) => {
    if (isSubmitting) return;

    const confirmed = await showConfirm({
      title: action === "archive" ? "Archive Items" : "Restore Items",
      message: `${action === "archive" ? "Archive" : "Restore"} ${selectedIds.size} items?`,
      confirmLabel: action === "archive" ? "Archive" : "Restore",
      variant: action === "archive" ? "warning" : "info"
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await adminAPI.bulkArchive(Array.from(selectedIds), action);
      await onSuccess?.();
      showToast(`Items ${action}d`, "success");
    } catch (error) {
      console.error(`[useBulkActions] Bulk ${action} failed:`, error);
      showToast(ERROR_MESSAGES.BULK_ARCHIVE_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (reservationId: string) => {
    if (isSubmitting) return;

    const confirmed = await showConfirm({
      title: "Archive Reservation",
      message: "Archive this reservation?",
      confirmLabel: "Archive",
      variant: "warning"
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await adminAPI.bulkArchive([reservationId], "archive");
      await onSuccess?.();
      showToast(SUCCESS_MESSAGES.RESERVATION_ARCHIVED, "success");
    } catch (error) {
      console.error("[useBulkActions] Archive failed:", error);
      showToast(ERROR_MESSAGES.RESERVATION_ARCHIVE_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    if (isSubmitting) return;

    const confirmed = await showConfirm({
      title: "Delete Maintenance Block",
      message: "Are you sure you want to delete this maintenance block? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await adminAPI.deleteBlackoutDate(maintenanceId);
      await onSuccess?.();
      showToast(SUCCESS_MESSAGES.BLACKOUT_DELETED, "success");
    } catch (error) {
      console.error("[useBulkActions] Delete maintenance failed:", error);
      showToast(ERROR_MESSAGES.BLACKOUT_DELETE_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleBulkAction,
    handleBulkAssignRandom,
    handleBulkArchive,
    handleArchive,
    handleDeleteMaintenance,
    ConfirmDialogComponent,
  };
}
