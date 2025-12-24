import { Reservation, BlackoutDate } from "@/lib/supabase";

export interface UpdateReservationParams {
  campsite_id: string | null;
  check_in: string;
  check_out: string;
}

export interface UpdateBlackoutParams {
  campsite_id?: string | null;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

export interface CreateBlackoutParams {
  campsite_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export const calendarService = {
  async updateReservation(id: string, params: UpdateReservationParams, signal?: AbortSignal): Promise<{ reservation: Reservation; emailSent: boolean; emailError?: string | null }> {
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
