/**
 * Unit tests for useReservationFilters hook
 *
 * Tests behavioral contract:
 * - filter changes update output deterministically
 * - sorting + filtering combos behave correctly
 * - default state matches expectations
 * - search query filtering works
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReservationFilters } from '@/hooks/admin/useReservationFilters';
import type { OverviewItem } from '@/lib/supabase';

describe('useReservationFilters', () => {
  const mockItems: OverviewItem[] = [
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
      campsite_code: 'S1',
      created_at: '2024-12-01T00:00:00Z',
      // Extended properties that the hook searches
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-0100',
      campsites: { code: 'S1' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
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
      campsite_code: 'S2',
      created_at: '2024-12-02T00:00:00Z',
      // Extended properties
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '555-0200',
      campsites: { code: 'S2' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    {
      type: 'reservation' as const,
      id: 'res-3',
      check_in: '2025-03-01',
      check_out: '2025-03-05',
      guest_name: 'Bob Wilson',
      guest_email: 'bob@example.com',
      guest_phone: '555-0300',
      adults: 4,
      children: 2,
      status: 'checked_in' as const,
      campsite_code: 'C1',
      created_at: '2024-12-03T00:00:00Z',
      // Extended properties
      first_name: 'Bob',
      last_name: 'Wilson',
      email: 'bob@example.com',
      phone: '555-0300',
      campsites: { code: 'C1' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    {
      type: 'maintenance' as const,
      id: 'main-1',
      start_date: '2025-04-01',
      end_date: '2025-04-05',
      reason: 'Spring cleaning',
      campsite_code: 'S3',
      created_at: '2024-12-04T00:00:00Z',
    },
  ];

  describe('default state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      expect(result.current.filter).toBe('all');
      expect(result.current.sortMode).toBe('start_date');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.sortedItems).toHaveLength(mockItems.length);
      // Should include all items (order may vary due to sorting)
      const ids = result.current.sortedItems.map(item => item.id);
      mockItems.forEach(item => {
        expect(ids).toContain(item.id);
      });
    });
  });

  describe('status filtering', () => {
    it('should show all items when filter is "all"', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      expect(result.current.sortedItems).toHaveLength(4);
      // Should include all items
      const ids = result.current.sortedItems.map(item => item.id);
      expect(ids).toContain('res-1');
      expect(ids).toContain('res-2');
      expect(ids).toContain('res-3');
      expect(ids).toContain('main-1');
    });

    it('should filter by pending status', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('pending');
      });

      expect(result.current.filter).toBe('pending');
      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-1');
    });

    it('should filter by confirmed status', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('confirmed');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-2');
    });

    it('should filter maintenance items', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('maintenance');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].type).toBe('maintenance');
      expect(result.current.sortedItems[0].id).toBe('main-1');
    });

    it('should return empty array for status with no matches', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('cancelled');
      });

      expect(result.current.sortedItems).toHaveLength(0);
    });
  });

  describe('search filtering', () => {
    it('should filter by guest name', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('john');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-1');
    });

    it('should be case-insensitive', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('JANE');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-2');
    });

    it('should filter by partial name match', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('Wils');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-3');
    });

    it('should filter by campsite code', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('C1');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-3');
    });

    it('should filter maintenance by reason', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('cleaning');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].type).toBe('maintenance');
    });

    it('should return empty array for no matches', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('nonexistent');
      });

      expect(result.current.sortedItems).toHaveLength(0);
    });

    it('should ignore whitespace in search query', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSearchQuery('   ');
      });

      // Should show all items when search is just whitespace
      expect(result.current.sortedItems).toHaveLength(4);
    });
  });

  describe('combined filtering', () => {
    it('should apply both status filter and search query', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('all');
        result.current.setSearchQuery('S1');
      });

      // Only reservation with campsite S1
      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-1');
    });

    it('should filter by status then search', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('confirmed');
        result.current.setSearchQuery('jane');
      });

      expect(result.current.sortedItems).toHaveLength(1);
      expect(result.current.sortedItems[0].id).toBe('res-2');
    });

    it('should return empty when combined filters have no matches', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setFilter('pending');
        result.current.setSearchQuery('jane'); // Jane is confirmed, not pending
      });

      expect(result.current.sortedItems).toHaveLength(0);
    });
  });

  describe('sorting', () => {
    it('should sort by start_date by default', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      expect(result.current.sortMode).toBe('start_date');
      // Should include all items (sorted)
      expect(result.current.sortedItems).toHaveLength(4);
    });

    it('should support changing sort mode', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      act(() => {
        result.current.setSortMode('created_at');
      });

      expect(result.current.sortMode).toBe('created_at');
      // Should still include all items
      expect(result.current.sortedItems).toHaveLength(4);
    });
  });

  describe('state updates', () => {
    it('should update filteredItems when filter changes', () => {
      const { result } = renderHook(() => useReservationFilters(mockItems));

      const initialLength = result.current.filteredItems.length;

      act(() => {
        result.current.setFilter('pending');
      });

      expect(result.current.filteredItems.length).not.toBe(initialLength);
      expect(result.current.filteredItems.length).toBe(1);
    });

    it('should update sortedItems when items prop changes', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useReservationFilters(items),
        { initialProps: { items: mockItems } }
      );

      expect(result.current.sortedItems).toHaveLength(4);

      const newItems = mockItems.slice(0, 2);
      rerender({ items: newItems });

      expect(result.current.sortedItems).toHaveLength(2);
    });
  });
});
