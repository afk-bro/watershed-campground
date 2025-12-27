"use client";

import { useState, useEffect, useCallback } from "react";
import type { OverviewItem } from "@/lib/supabase";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/lib/admin/constants";

interface UseReservationDataOptions {
  showArchived?: boolean;
}

interface UseReservationDataReturn {
  items: OverviewItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useReservationData - Custom hook for fetching and managing reservation data
 *
 * Handles data fetching, loading states, and error management for the admin
 * reservations list. Automatically refetches when showArchived changes.
 *
 * @param options - Configuration options
 * @param options.showArchived - Whether to show archived reservations only
 *
 * @returns Reservation data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * const { items, loading, error, refetch } = useReservationData({
 *   showArchived: false
 * });
 * ```
 */
export function useReservationData({
  showArchived = false,
}: UseReservationDataOptions = {}): UseReservationDataReturn {
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS);

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.RESERVATION_FETCH_FAILED);
      }

      const { data } = await response.json();

      // Filter based on archived status
      const filtered = showArchived
        ? (data || []).filter(
            (item: OverviewItem) =>
              item.type === "reservation" && (item as any).archived_at != null
          )
        : Array.isArray(data)
        ? data
        : [];

      setItems(filtered);
    } catch (err) {
      console.error("[useReservationData] Error fetching reservations:", err);
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.RESERVATION_FETCH_FAILED
      );
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  // Auto-fetch on mount and when showArchived changes
  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  return {
    items,
    loading,
    error,
    refetch: fetchReservations,
  };
}
