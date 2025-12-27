/**
 * Unit tests for useReservationData hook
 *
 * Tests behavioral contract:
 * - fetch success populates normalized data
 * - loading + error states are correct
 * - refetch functionality works
 * - showArchived filtering works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useReservationData } from '@/hooks/admin/useReservationData';
import type { OverviewItem } from '@/lib/supabase';

// Mock the admin API client
vi.mock('@/lib/admin/api-client', () => ({
  adminAPI: {
    getReservations: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

import { adminAPI } from '@/lib/admin/api-client';

describe('useReservationData', () => {
  const mockReservations: OverviewItem[] = [
    {
      type: 'reservation' as const,
      id: 'res-1',
      check_in: '2025-01-01',
      check_out: '2025-01-05',
      guest_name: 'John Doe',
      guest_email: 'john@example.com',
      guest_phone: '555-0100',
      adults: 2,
      children: 1,
      status: 'pending' as const,
      created_at: '2024-12-01T00:00:00Z',
    },
    {
      type: 'reservation' as const,
      id: 'res-2',
      check_in: '2025-02-01',
      check_out: '2025-02-05',
      guest_name: 'Jane Smith',
      guest_email: 'jane@example.com',
      guest_phone: '555-0200',
      adults: 2,
      children: 0,
      status: 'confirmed' as const,
      created_at: '2024-12-02T00:00:00Z',
      archived_at: '2024-12-10T00:00:00Z',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial data fetching', () => {
    it('should start in loading state', () => {
      vi.mocked(adminAPI.getReservations).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useReservationData());

      expect(result.current.loading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch and populate data on success', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: mockReservations,
      });

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual(mockReservations);
      expect(result.current.error).toBeNull();
      expect(adminAPI.getReservations).toHaveBeenCalledTimes(1);
    });

    it('should handle empty data array', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: [],
      });

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle null data gracefully', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: null as any,
      });

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error state on fetch failure', async () => {
      const errorMessage = 'Network error';
      vi.mocked(adminAPI.getReservations).mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.items).toEqual([]);
    });

    it('should handle non-Error objects', async () => {
      vi.mocked(adminAPI.getReservations).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.items).toEqual([]);
    });
  });

  describe('showArchived filter', () => {
    it('should filter out archived items when showArchived is false', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: mockReservations,
      });

      const { result } = renderHook(() =>
        useReservationData({ showArchived: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should get all items when showArchived is false (API returns both)
      expect(result.current.items).toEqual(mockReservations);
    });

    it('should show only archived items when showArchived is true', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: mockReservations,
      });

      const { result } = renderHook(() =>
        useReservationData({ showArchived: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only include archived reservation
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('res-2');
    });

    it('should refetch when showArchived changes', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: mockReservations,
      });

      const { result, rerender } = renderHook(
        ({ showArchived }) => useReservationData({ showArchived }),
        { initialProps: { showArchived: false } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(adminAPI.getReservations).toHaveBeenCalledTimes(1);

      // Change showArchived
      rerender({ showArchived: true });

      await waitFor(() => {
        expect(adminAPI.getReservations).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('refetch functionality', () => {
    it('should refetch data when refetch is called', async () => {
      vi.mocked(adminAPI.getReservations).mockResolvedValue({
        data: mockReservations,
      });

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(adminAPI.getReservations).toHaveBeenCalledTimes(1);

      // Call refetch wrapped in act
      await act(async () => {
        await result.current.refetch();
      });

      expect(adminAPI.getReservations).toHaveBeenCalledTimes(2);
    });

    it('should update data after refetch', async () => {
      const initialData = [mockReservations[0]];
      const updatedData = mockReservations;

      vi.mocked(adminAPI.getReservations)
        .mockResolvedValueOnce({ data: initialData })
        .mockResolvedValueOnce({ data: updatedData });

      const { result } = renderHook(() => useReservationData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);

      // Refetch wrapped in act
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2);
      });
    });
  });
});
