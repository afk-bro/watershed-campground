/**
 * Unit tests for useBulkActions hook
 *
 * Tests behavioral contract:
 * - action triggers call correct API layer (mocked)
 * - successful actions trigger onSuccess callback
 * - errors are handled appropriately
 * - isSubmitting state managed correctly
 * - confirmation dialogs shown before destructive actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBulkActions } from '@/hooks/admin/useBulkActions';

// Mock the admin API client
vi.mock('@/lib/admin/api-client', () => ({
  adminAPI: {
    bulkUpdateStatus: vi.fn(),
    bulkAssignRandom: vi.fn(),
    bulkArchive: vi.fn(),
    deleteBlackoutDate: vi.fn(),
  },
}));

// Mock the toast hook
const mockShowToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

import { adminAPI } from '@/lib/admin/api-client';

describe('useBulkActions', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true); // Default to confirming
  });

  describe('initialization', () => {
    it('should initialize with isSubmitting false', () => {
      const { result } = renderHook(() => useBulkActions());

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should provide all handler functions', () => {
      const { result } = renderHook(() => useBulkActions());

      expect(typeof result.current.handleBulkAction).toBe('function');
      expect(typeof result.current.handleBulkAssignRandom).toBe('function');
      expect(typeof result.current.handleBulkArchive).toBe('function');
      expect(typeof result.current.handleArchive).toBe('function');
      expect(typeof result.current.handleDeleteMaintenance).toBe('function');
    });
  });

  describe('handleBulkAction', () => {
    it('should call bulkUpdateStatus API with correct params', async () => {
      vi.mocked(adminAPI.bulkUpdateStatus).mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useBulkActions({ onSuccess: mockOnSuccess })
      );

      const selectedIds = new Set(['res-1', 'res-2']);

      await act(async () => {
        await result.current.handleBulkAction('check_in', selectedIds);
      });

      expect(adminAPI.bulkUpdateStatus).toHaveBeenCalledWith(
        ['res-1', 'res-2'],
        'check_in'
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog before proceeding', async () => {
      mockConfirm.mockReturnValue(false); // User cancels

      const { result } = renderHook(() => useBulkActions());
      const selectedIds = new Set(['res-1']);

      await act(async () => {
        await result.current.handleBulkAction('cancel', selectedIds);
      });

      expect(mockConfirm).toHaveBeenCalledWith('Process 1 reservations?');
      expect(adminAPI.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should handle all action types', async () => {
      vi.mocked(adminAPI.bulkUpdateStatus).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useBulkActions());
      const selectedIds = new Set(['res-1']);

      // Test check_in
      await act(async () => {
        await result.current.handleBulkAction('check_in', selectedIds);
      });
      expect(adminAPI.bulkUpdateStatus).toHaveBeenCalledWith(
        ['res-1'],
        'check_in'
      );

      // Test check_out
      await act(async () => {
        await result.current.handleBulkAction('check_out', selectedIds);
      });
      expect(adminAPI.bulkUpdateStatus).toHaveBeenCalledWith(
        ['res-1'],
        'check_out'
      );

      // Test cancel
      await act(async () => {
        await result.current.handleBulkAction('cancel', selectedIds);
      });
      expect(adminAPI.bulkUpdateStatus).toHaveBeenCalledWith(
        ['res-1'],
        'cancel'
      );
    });
  });

  describe('handleBulkAssignRandom', () => {
    it('should call bulkAssignRandom API with correct params', async () => {
      vi.mocked(adminAPI.bulkAssignRandom).mockResolvedValue({
        results: [{ success: true }, { success: true }],
      });

      const { result } = renderHook(() =>
        useBulkActions({ onSuccess: mockOnSuccess })
      );

      const selectedIds = new Set(['res-1', 'res-2']);

      await act(async () => {
        await result.current.handleBulkAssignRandom(selectedIds);
      });

      expect(adminAPI.bulkAssignRandom).toHaveBeenCalledWith([
        'res-1',
        'res-2',
      ]);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog', async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useBulkActions());
      const selectedIds = new Set(['res-1', 'res-2']);

      await act(async () => {
        await result.current.handleBulkAssignRandom(selectedIds);
      });

      expect(mockConfirm).toHaveBeenCalledWith('Auto-assign 2 reservations?');
      expect(adminAPI.bulkAssignRandom).not.toHaveBeenCalled();
    });
  });

  describe('handleBulkArchive', () => {
    it('should call bulkArchive API for archive action', async () => {
      vi.mocked(adminAPI.bulkArchive).mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useBulkActions({ onSuccess: mockOnSuccess })
      );

      const selectedIds = new Set(['res-1']);

      await act(async () => {
        await result.current.handleBulkArchive('archive', selectedIds);
      });

      expect(adminAPI.bulkArchive).toHaveBeenCalledWith(['res-1'], 'archive');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call bulkArchive API for restore action', async () => {
      vi.mocked(adminAPI.bulkArchive).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useBulkActions());

      const selectedIds = new Set(['res-1']);

      await act(async () => {
        await result.current.handleBulkArchive('restore', selectedIds);
      });

      expect(adminAPI.bulkArchive).toHaveBeenCalledWith(['res-1'], 'restore');
    });

    it('should show confirmation with action in message', async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useBulkActions());
      const selectedIds = new Set(['res-1', 'res-2']);

      await act(async () => {
        await result.current.handleBulkArchive('archive', selectedIds);
      });

      expect(mockConfirm).toHaveBeenCalledWith('archive 2 items?');
      expect(adminAPI.bulkArchive).not.toHaveBeenCalled();
    });
  });

  describe('handleArchive (single item)', () => {
    it('should call bulkArchive API for single item', async () => {
      vi.mocked(adminAPI.bulkArchive).mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useBulkActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleArchive('res-1');
      });

      expect(adminAPI.bulkArchive).toHaveBeenCalledWith(['res-1'], 'archive');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog', async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useBulkActions());

      await act(async () => {
        await result.current.handleArchive('res-1');
      });

      expect(mockConfirm).toHaveBeenCalledWith('Archive this reservation?');
      expect(adminAPI.bulkArchive).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteMaintenance', () => {
    it('should call deleteBlackoutDate API', async () => {
      vi.mocked(adminAPI.deleteBlackoutDate).mockResolvedValue({ data: {} });

      const { result } = renderHook(() =>
        useBulkActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleDeleteMaintenance('main-1');
      });

      expect(adminAPI.deleteBlackoutDate).toHaveBeenCalledWith('main-1');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog', async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useBulkActions());

      await act(async () => {
        await result.current.handleDeleteMaintenance('main-1');
      });

      expect(mockConfirm).toHaveBeenCalledWith('Delete maintenance block?');
      expect(adminAPI.deleteBlackoutDate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(adminAPI.bulkUpdateStatus).mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(() => useBulkActions());
      const selectedIds = new Set(['res-1']);

      await act(async () => {
        await result.current.handleBulkAction('check_in', selectedIds);
      });

      // Should reset submitting state after error
      expect(result.current.isSubmitting).toBe(false);
      // onSuccess should not be called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
