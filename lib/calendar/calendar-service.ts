import { Reservation, BlackoutDate } from "@/lib/supabase";

export interface UpdateReservationParams {
  campsite_id: string | null;
  check_in: string;
  check_out: string;
  status?: string; // Align with API supporting status updates
}

export interface UpdateBlackoutParams {
  campsite_id?: string | null;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

export interface CreateBlackoutParams {
  campsite_id: string | null; // Support global blackouts (null)
  start_date: string;
  end_date: string;
  reason: string;
}

/**
 * Helper to check if signal is already aborted and throw early
 * This prevents race conditions where signal is aborted between check and fetch
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

export const calendarService = {
  async updateReservation(id: string, params: UpdateReservationParams, signal?: AbortSignal): Promise<{ reservation: Reservation; emailSent: boolean; emailError?: string | null }> {
    // Fail fast if already aborted
    throwIfAborted(signal);

    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update reservation");
    }

    return response.json();
  },

  async updateBlackoutDate(id: string, params: UpdateBlackoutParams, signal?: AbortSignal): Promise<BlackoutDate> {
    // Fail fast if already aborted
    throwIfAborted(signal);

    const response = await fetch(`/api/admin/blackout-dates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "Failed to update blackout date");
    }

    return response.json();
  },

  async createBlackoutDate(params: CreateBlackoutParams, signal?: AbortSignal): Promise<BlackoutDate> {
    // Fail fast if already aborted
    throwIfAborted(signal);

    const response = await fetch("/api/admin/blackout-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create blackout date");
    }

    return response.json();
  },

  async deleteBlackoutDate(id: string, signal?: AbortSignal): Promise<void> {
    // Fail fast if already aborted
    throwIfAborted(signal);

    const response = await fetch(`/api/admin/blackout-dates/${id}`, {
      method: "DELETE",
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete blackout date");
    }
  },
};
