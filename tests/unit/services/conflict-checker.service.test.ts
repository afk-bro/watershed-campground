/**
 * Unit tests for conflict checker service
 *
 * Tests behavioral contract:
 * - No conflicts scenario (available dates)
 * - Reservation conflicts detection
 * - Blackout date conflicts detection
 * - Both types of conflicts together
 * - Excluding specific reservation IDs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase admin client - must be before import
vi.mock("@/lib/supabase-admin", () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOr = vi.fn();
  const mockLt = vi.fn();
  const mockGte = vi.fn();
  const mockGt = vi.fn();
  const mockNot = vi.fn();
  const mockNeq = vi.fn();

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
    // Export mocks for test access
    __mocks: {
      mockFrom,
      mockSelect,
      mockEq,
      mockOr,
      mockLt,
      mockGte,
      mockGt,
      mockNot,
      mockNeq,
    },
  };
});

import {
  checkReservationConflicts,
  type ConflictCheckParams,
} from "@/lib/services/conflict-checker.service";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Access mocks
const mockFrom = (supabaseAdmin as unknown as typeof supabaseAdmin & { from: ReturnType<typeof vi.fn> }).from;
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockLt = vi.fn();
const mockGte = vi.fn();
const mockGt = vi.fn();
const mockNot = vi.fn();
const mockNeq = vi.fn();

describe("conflict-checker.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ or: mockOr, eq: mockEq, lt: mockLt });
    mockOr.mockReturnValue({ lt: mockLt });
    mockLt.mockReturnValue({ gte: mockGte, gt: mockGt });
    mockGte.mockReturnValue({ data: null, error: null });
    mockGt.mockReturnValue({ not: mockNot });
    mockNot.mockReturnValue({ neq: mockNeq, data: null, error: null });
    mockNeq.mockReturnValue({ data: null, error: null });
  });

  describe("checkReservationConflicts", () => {
    const baseParams: ConflictCheckParams = {
      campsiteId: "camp-123",
      checkIn: "2025-06-01",
      checkOut: "2025-06-05",
      organizationId: "org-456",
    };

    it("should return no conflicts when campsite is available", async () => {
      // Mock: no blackouts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      // Mock: no reservations
      mockNot.mockReturnValue({ data: [], error: null });

      const result = await checkReservationConflicts(baseParams);

      expect(result.hasConflicts).toBe(false);
      expect(result.reservationConflicts).toEqual([]);
      expect(result.blackoutConflicts).toEqual([]);
    });

    it("should detect reservation conflicts", async () => {
      const mockConflicts = [
        { id: "res-1", first_name: "John", last_name: "Doe" },
        { id: "res-2", first_name: "Jane", last_name: "Smith" },
      ];

      // Mock: no blackouts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      // Mock: has reservation conflicts
      mockNot.mockReturnValue({ data: mockConflicts, error: null });

      const result = await checkReservationConflicts(baseParams);

      expect(result.hasConflicts).toBe(true);
      expect(result.reservationConflicts).toEqual(mockConflicts);
      expect(result.blackoutConflicts).toEqual([]);
    });

    it("should detect blackout date conflicts", async () => {
      const mockBlackouts = [
        {
          id: "black-1",
          start_date: "2025-06-01",
          end_date: "2025-06-03",
          reason: "Maintenance",
        },
      ];

      // Mock: has blackout conflicts
      mockGte.mockReturnValueOnce({ data: mockBlackouts, error: null });
      // Mock: no reservation conflicts
      mockNot.mockReturnValue({ data: [], error: null });

      const result = await checkReservationConflicts(baseParams);

      expect(result.hasConflicts).toBe(true);
      expect(result.reservationConflicts).toEqual([]);
      expect(result.blackoutConflicts).toEqual(mockBlackouts);
    });

    it("should detect both reservation and blackout conflicts", async () => {
      const mockBlackouts = [
        {
          id: "black-1",
          start_date: "2025-06-01",
          end_date: "2025-06-03",
          reason: "Maintenance",
        },
      ];

      const mockReservations = [
        { id: "res-1", first_name: "John", last_name: "Doe" },
      ];

      // Mock: has blackout conflicts
      mockGte.mockReturnValueOnce({ data: mockBlackouts, error: null });
      // Mock: has reservation conflicts
      mockNot.mockReturnValue({ data: mockReservations, error: null });

      const result = await checkReservationConflicts(baseParams);

      expect(result.hasConflicts).toBe(true);
      expect(result.reservationConflicts).toEqual(mockReservations);
      expect(result.blackoutConflicts).toEqual(mockBlackouts);
    });

    it("should exclude specific reservation when updating", async () => {
      const paramsWithExclusion: ConflictCheckParams = {
        ...baseParams,
        excludeReservationId: "res-123",
      };

      // Mock: no blackouts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      // Mock: no conflicts after exclusion
      mockNeq.mockReturnValue({ data: [], error: null });

      const result = await checkReservationConflicts(paramsWithExclusion);

      expect(result.hasConflicts).toBe(false);
      expect(mockNeq).toHaveBeenCalledWith("id", "res-123");
    });

    it("should query with correct organization scope", async () => {
      // Mock: no conflicts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      mockNot.mockReturnValue({ data: [], error: null });

      await checkReservationConflicts(baseParams);

      // Verify organization ID is used in both queries
      expect(mockEq).toHaveBeenCalledWith("organization_id", "org-456");
    });

    it("should query with correct campsite ID", async () => {
      // Mock: no conflicts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      mockNot.mockReturnValue({ data: [], error: null });

      await checkReservationConflicts(baseParams);

      // Verify campsite ID is used
      expect(mockOr).toHaveBeenCalledWith(
        "campsite_id.is.null,campsite_id.eq.camp-123"
      );
      expect(mockEq).toHaveBeenCalledWith("campsite_id", "camp-123");
    });

    it("should query with correct date range for overlaps", async () => {
      // Mock: no conflicts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      mockNot.mockReturnValue({ data: [], error: null });

      await checkReservationConflicts(baseParams);

      // Verify date overlap logic
      // For blackouts: start_date < checkOut AND end_date >= checkIn
      expect(mockLt).toHaveBeenCalledWith("start_date", "2025-06-05");
      expect(mockGte).toHaveBeenCalledWith("end_date", "2025-06-01");

      // For reservations: check_in < checkOut AND check_out > checkIn
      expect(mockLt).toHaveBeenCalledWith("check_in", "2025-06-05");
      expect(mockGt).toHaveBeenCalledWith("check_out", "2025-06-01");
    });

    it("should exclude cancelled and no-show reservations", async () => {
      // Mock: no conflicts
      mockGte.mockReturnValueOnce({ data: [], error: null });
      mockNot.mockReturnValue({ data: [], error: null });

      await checkReservationConflicts(baseParams);

      // Verify status filter
      expect(mockNot).toHaveBeenCalledWith("status", "in", "(cancelled,no_show)");
    });
  });
});
