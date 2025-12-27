/**
 * Admin API Client
 *
 * Centralized API client for all admin panel API calls.
 * Provides consistent error handling, request configuration, and type safety.
 */

import type { Reservation, ReservationStatus, Campsite, BlackoutDate, OverviewItem } from "@/lib/supabase";
import { API_ENDPOINTS, ERROR_MESSAGES } from "./constants";

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Admin API Client
 *
 * Handles all HTTP requests to admin API endpoints with:
 * - Consistent error handling
 * - Request/response interceptors
 * - Type-safe methods
 * - Automatic JSON parsing
 */
class AdminAPIClient {
  private async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API Error: ${response.statusText}`;

        // Try to parse error JSON
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If not JSON, use text as-is
          if (errorText) errorMessage = errorText;
        }

        throw new APIError(
          errorMessage,
          response.status,
          `HTTP_${response.status}`,
          errorText
        );
      }

      // Parse successful response
      const data = await response.json();
      return data;
    } catch (error) {
      // Re-throw APIError as-is
      if (error instanceof APIError) {
        throw error;
      }

      // Wrap other errors (network errors, etc.)
      console.error(`[AdminAPIClient] Request failed: ${url}`, error);
      throw new APIError(
        error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR,
        undefined,
        "NETWORK_ERROR",
        error
      );
    }
  }

  // ============================================================================
  // Reservations
  // ============================================================================

  /**
   * Get all reservations
   */
  async getReservations() {
    return this.request<{ data: OverviewItem[] }>(API_ENDPOINTS.RESERVATIONS);
  }

  /**
   * Get a single reservation by ID
   */
  async getReservation(id: string) {
    return this.request<{ data: Reservation }>(
      API_ENDPOINTS.RESERVATION_DETAIL(id)
    );
  }

  /**
   * Update reservation status
   */
  async updateReservationStatus(id: string, status: ReservationStatus) {
    return this.request<{ data: Reservation }>(
      API_ENDPOINTS.RESERVATION_DETAIL(id),
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
  }

  /**
   * Update reservation data (partial update)
   */
  async updateReservation(id: string, data: Partial<Reservation>) {
    return this.request<{ data: Reservation }>(
      API_ENDPOINTS.RESERVATION_DETAIL(id),
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Assign a campsite to a reservation
   */
  async assignCampsite(reservationId: string, campsiteId: string) {
    return this.request<{ data: Reservation }>(
      API_ENDPOINTS.RESERVATION_ASSIGN(reservationId),
      {
        method: "POST",
        body: JSON.stringify({ campsiteId }),
      }
    );
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Bulk update reservation statuses
   */
  async bulkUpdateStatus(
    reservationIds: string[],
    status: "check_in" | "check_out" | "cancel"
  ) {
    return this.request<{ data: unknown }>(API_ENDPOINTS.BULK_STATUS, {
      method: "POST",
      body: JSON.stringify({ reservationIds, status }),
    });
  }

  /**
   * Bulk assign random campsites
   */
  async bulkAssignRandom(reservationIds: string[]) {
    return this.request<{ results: Array<{ success: boolean }> }>(
      API_ENDPOINTS.BULK_ASSIGN,
      {
        method: "POST",
        body: JSON.stringify({ reservationIds }),
      }
    );
  }

  /**
   * Bulk archive or restore reservations
   */
  async bulkArchive(
    reservationIds: string[],
    action: "archive" | "restore"
  ) {
    return this.request<{ data: unknown }>(API_ENDPOINTS.BULK_ARCHIVE, {
      method: "POST",
      body: JSON.stringify({ reservationIds, action }),
    });
  }

  // ============================================================================
  // Blackout Dates / Maintenance
  // ============================================================================

  /**
   * Get all blackout dates
   */
  async getBlackoutDates() {
    return this.request<{ data: BlackoutDate[] }>(API_ENDPOINTS.BLACKOUT_DATES);
  }

  /**
   * Create a blackout date
   */
  async createBlackoutDate(data: {
    start_date: string;
    end_date: string;
    campsite_id?: string | null;
    reason?: string;
  }) {
    return this.request<{ data: BlackoutDate }>(API_ENDPOINTS.BLACKOUT_DATES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a blackout date
   */
  async updateBlackoutDate(id: string, data: Partial<BlackoutDate>) {
    return this.request<{ data: BlackoutDate }>(
      API_ENDPOINTS.BLACKOUT_DETAIL(id),
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Delete a blackout date
   */
  async deleteBlackoutDate(id: string) {
    return this.request<{ data: unknown }>(API_ENDPOINTS.BLACKOUT_DETAIL(id), {
      method: "DELETE",
    });
  }

  // ============================================================================
  // Calendar / Availability
  // ============================================================================

  /**
   * Get calendar availability data
   */
  async getCalendarData(params?: { month?: string; year?: string }) {
    const queryString = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return this.request<{ data: unknown }>(
      `${API_ENDPOINTS.CALENDAR}${queryString}`
    );
  }

  // ============================================================================
  // Campsites
  // ============================================================================

  /**
   * Get all campsites
   */
  async getCampsites() {
    return this.request<{ data: Campsite[] }>("/api/admin/campsites");
  }

  /**
   * Get a single campsite
   */
  async getCampsite(id: string) {
    return this.request<{ data: Campsite }>(`/api/admin/campsites/${id}`);
  }

  /**
   * Create a campsite
   */
  async createCampsite(data: Partial<Campsite>) {
    return this.request<{ data: Campsite }>("/api/admin/campsites", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a campsite
   */
  async updateCampsite(id: string, data: Partial<Campsite>) {
    return this.request<{ data: Campsite }>(`/api/admin/campsites/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a campsite
   */
  async deleteCampsite(id: string) {
    return this.request<{ data: unknown }>(`/api/admin/campsites/${id}`, {
      method: "DELETE",
    });
  }
}

/**
 * Singleton instance of the Admin API Client
 *
 * @example
 * ```tsx
 * import { adminAPI } from '@/lib/admin/api-client';
 *
 * // Get reservations
 * const { data } = await adminAPI.getReservations();
 *
 * // Update status
 * await adminAPI.updateReservationStatus(id, 'confirmed');
 * ```
 */
export const adminAPI = new AdminAPIClient();
