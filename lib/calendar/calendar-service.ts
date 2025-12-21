import { Reservation, BlackoutDate } from "@/lib/supabase";

export interface UpdateReservationParams {
  campsite_id: string | null;
  check_in: string;
  check_out: string;
}

export interface UpdateBlackoutParams {
  campsite_id: string | null;
  start_date: string;
  end_date: string;
}

export interface CreateBlackoutParams {
  campsite_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export const calendarService = {
  async updateReservation(id: string, params: UpdateReservationParams): Promise<{ emailSent: boolean }> {
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update reservation");
    }

    return response.json();
  },

  async updateBlackoutDate(id: string, params: UpdateBlackoutParams): Promise<BlackoutDate> {
    const response = await fetch(`/api/admin/blackout-dates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "Failed to update blackout date");
    }

    return response.json();
  },

  async createBlackoutDate(params: CreateBlackoutParams): Promise<BlackoutDate> {
    const response = await fetch("/api/admin/blackout-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create blackout date");
    }

    return response.json();
  },
};
