/**
 * Unit Tests for Reservation Service
 *
 * Tests reservation update business logic without testing mock behavior.
 * Focuses on validation, conflict detection, and update orchestration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateReservation,
  ReservationValidationError,
  ReservationConflictError,
  type UpdateReservationParams
} from '@/lib/services/reservation.service';

// Mock dependencies
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn()
  }
}));

vi.mock('@/lib/services/conflict-checker.service', () => ({
  checkReservationConflicts: vi.fn()
}));

vi.mock('@/lib/services/notification.service', () => ({
  sendReservationNotification: vi.fn().mockResolvedValue({ sent: true }),
  shouldSendNotification: vi.fn()
}));

vi.mock('@/lib/audit/audit-service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Import mocked modules
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkReservationConflicts } from '@/lib/services/conflict-checker.service';
import { shouldSendNotification } from '@/lib/services/notification.service';

describe('reservation.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOldReservation = {
    id: 'res-123',
    status: 'confirmed' as const,
    campsite_id: 'site-123',
    check_in: '2025-06-01',
    check_out: '2025-06-05',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    notes: 'Test reservation',
    updated_at: '2025-01-01T00:00:00Z',
    campsites: {
      id: 'site-123',
      name: 'Lakeside A1',
      code: 'A1'
    }
  };

  const mockUpdatedReservation = {
    ...mockOldReservation,
    check_in: '2025-06-02',
    updated_at: '2025-01-02T00:00:00Z'
  };

  describe('updateReservation', () => {
    describe('successful updates', () => {
      beforeEach(() => {
        // Mock fetch reservation
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdatedReservation,
                    error: null
                  })
                })
              })
            })
          })
        } as any);

        // Mock no conflicts
        vi.mocked(checkReservationConflicts).mockResolvedValue({
          hasConflicts: false,
          reservationConflicts: [],
          blackoutConflicts: []
        });

        // Mock no notification needed
        vi.mocked(shouldSendNotification).mockReturnValue(null);
      });

      it('should update reservation successfully', async () => {
        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            check_in: '2025-06-02'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        expect(result.reservation.id).toBe('res-123');
        expect(result.reservation.check_in).toBe('2025-06-02');
      });

      it('should update multiple fields', async () => {
        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            check_in: '2025-06-02',
            check_out: '2025-06-06',
            first_name: 'Jane',
            email: 'jane@example.com'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        expect(result.reservation).toBeDefined();
        expect(result.emailSent).toBe(false);
      });

      it('should update status without checking conflicts', async () => {
        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            status: 'cancelled'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        // Conflict check should not be called for status-only changes
        expect(checkReservationConflicts).not.toHaveBeenCalled();
      });

      it('should update notes without checking conflicts', async () => {
        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            notes: 'Updated notes'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        expect(checkReservationConflicts).not.toHaveBeenCalled();
      });

      it('should set campsite_id to null (unassign)', async () => {
        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            campsite_id: null
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        // No conflict check needed when unassigning
        expect(checkReservationConflicts).not.toHaveBeenCalled();
      });
    });

    describe('validation', () => {
      it('should throw error if reservation not found', async () => {
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        } as any);

        const params: UpdateReservationParams = {
          id: 'res-999',
          updates: { check_in: '2025-06-02' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          ReservationValidationError
        );
        await expect(updateReservation(params)).rejects.toThrow(
          'Reservation not found'
        );
      });

      it('should throw error if check-out is before check-in', async () => {
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          })
        } as any);

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            check_in: '2025-06-10',
            check_out: '2025-06-05'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          ReservationValidationError
        );
        await expect(updateReservation(params)).rejects.toThrow(
          'Check-out must be after check-in'
        );
      });

      it('should throw error if check-out equals check-in', async () => {
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          })
        } as any);

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            check_in: '2025-06-05',
            check_out: '2025-06-05'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          'Check-out must be after check-in'
        );
      });

      it('should throw error if campsite not found', async () => {
        // Mock fetch reservation success
        vi.mocked(supabaseAdmin.from)
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockOldReservation,
                    error: null
                  })
                })
              })
            })
          } as any)
          // Mock campsite verification failure
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            })
          } as any);

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: {
            campsite_id: 'site-999'
          },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          'Campsite not found'
        );
      });
    });

    describe('conflict detection', () => {
      beforeEach(() => {
        // Mock fetch and update success
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          })
        } as any);
      });

      it('should check conflicts when check-in changes', async () => {
        vi.mocked(checkReservationConflicts).mockResolvedValue({
          hasConflicts: false,
          reservationConflicts: [],
          blackoutConflicts: []
        });

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { check_in: '2025-06-02' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        // Need to also mock update
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdatedReservation,
                    error: null
                  })
                })
              })
            })
          })
        } as any);

        await updateReservation(params);

        expect(checkReservationConflicts).toHaveBeenCalledWith({
          campsiteId: 'site-123',
          checkIn: '2025-06-02',
          checkOut: '2025-06-05',
          organizationId: 'org-123',
          excludeReservationId: 'res-123'
        });
      });

      it('should throw error on blackout conflict', async () => {
        vi.mocked(checkReservationConflicts).mockResolvedValue({
          hasConflicts: true,
          reservationConflicts: [],
          blackoutConflicts: [
            {
              id: 'blackout-123',
              start_date: '2025-06-01',
              end_date: '2025-06-03',
              reason: 'Maintenance'
            }
          ]
        });

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { check_in: '2025-06-02' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          ReservationConflictError
        );
        await expect(updateReservation(params)).rejects.toThrow(
          'Conflict with blackout date'
        );
      });

      it('should throw error on reservation conflict', async () => {
        vi.mocked(checkReservationConflicts).mockResolvedValue({
          hasConflicts: true,
          reservationConflicts: [
            {
              id: 'res-456',
              first_name: 'Jane',
              last_name: 'Smith'
            }
          ],
          blackoutConflicts: []
        });

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { check_in: '2025-06-02' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          'Conflicts with existing reservation'
        );
      });
    });

    describe('notification triggering', () => {
      beforeEach(() => {
        // Mock successful fetch and update
        vi.mocked(supabaseAdmin.from).mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOldReservation,
                  error: null
                })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdatedReservation,
                    error: null
                  })
                })
              })
            })
          })
        } as any);

        vi.mocked(checkReservationConflicts).mockResolvedValue({
          hasConflicts: false,
          reservationConflicts: [],
          blackoutConflicts: []
        });
      });

      it('should send notification when shouldSendNotification returns type', async () => {
        vi.mocked(shouldSendNotification).mockReturnValue('reservation_update');

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { check_in: '2025-06-02' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        expect(result.emailSent).toBe(true);
      });

      it('should not send notification when shouldSendNotification returns null', async () => {
        vi.mocked(shouldSendNotification).mockReturnValue(null);

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { notes: 'Updated notes' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        const result = await updateReservation(params);

        expect(result.emailSent).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw error if database update fails', async () => {
        vi.mocked(supabaseAdmin.from)
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockOldReservation,
                    error: null
                  })
                })
              })
            })
          } as any)
          .mockReturnValueOnce({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Database error' }
                    })
                  })
                })
              })
            })
          } as any);

        const params: UpdateReservationParams = {
          id: 'res-123',
          updates: { notes: 'Test' },
          organizationId: 'org-123',
          userId: 'user-123'
        };

        await expect(updateReservation(params)).rejects.toThrow(
          'Failed to update reservation'
        );
      });
    });
  });
});
