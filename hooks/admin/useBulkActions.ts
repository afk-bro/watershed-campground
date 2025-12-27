"use client";

import { useState } from "react";
import type { ReservationStatus } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import {
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/lib/admin/constants";

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

  const handleBulkAction = async (
    action: "check_in" | "check_out" | "cancel",
    selectedIds: Set<string>
  ) => {
    if (isSubmitting) return;
    if (!confirm(`Process ${selectedIds.size} reservations?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.BULK_STATUS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationIds: Array.from(selectedIds),
          status: action,
        }),
      });

      if (!res.ok) throw new Error(ERROR_MESSAGES.BULK_ACTION_FAILED);

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
    if (!confirm(`Auto-assign ${selectedIds.size} reservations?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.BULK_ASSIGN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      const successCount = (data.results || []).filter(
        (r: any) => r.success
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
    if (!confirm(`${action} ${selectedIds.size} items?`)) return;

    setIsSubmitting(true);
    try {
      await fetch(API_ENDPOINTS.BULK_ARCHIVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationIds: Array.from(selectedIds),
          action,
        }),
      });

      await onSuccess?.();
      showToast(
        `Items ${action}d`,
        "success"
      );
    } catch (error) {
      console.error(`[useBulkActions] Bulk ${action} failed:`, error);
      showToast(ERROR_MESSAGES.BULK_ARCHIVE_FAILED, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (reservationId: string) => {
    if (isSubmitting) return;
    if (!confirm("Archive this reservation?")) return;

    setIsSubmitting(true);
    try {
      await fetch(API_ENDPOINTS.BULK_ARCHIVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationIds: [reservationId], action: "archive" }),
      });

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
    if (!confirm("Delete maintenance block?")) return;

    setIsSubmitting(true);
    try {
      await fetch(API_ENDPOINTS.BLACKOUT_DETAIL(maintenanceId), {
        method: "DELETE",
      });

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
  };
}
