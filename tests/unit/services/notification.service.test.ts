/**
 * Unit Tests for Notification Service
 *
 * Tests email notification logic without testing mock behavior.
 * Focuses on business logic: email content generation, notification triggering logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendReservationNotification,
  shouldSendNotification,
  type EmailNotificationParams,
  type EmailReservationData
} from '@/lib/services/notification.service';

// Mock dependencies
vi.mock('@/lib/services/email.service', () => ({
  getResendClient: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
    }
  }))
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Store original env
const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;

describe('notification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
  });

  describe('sendReservationNotification', () => {
    const mockReservation: EmailReservationData = {
      id: 'res-123',
      email: 'guest@example.com',
      first_name: 'John',
      last_name: 'Doe',
      check_in: '2025-06-01',
      check_out: '2025-06-05',
      guest_count: 2,
      campsite: {
        name: 'Lakeside A1',
        code: 'A1'
      }
    };

    describe('reservation_confirmation type', () => {
      it('should send confirmation email with payment context', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_confirmation',
          reservation: mockReservation,
          paymentContext: {
            paymentStatus: 'paid',
            amountPaid: 150.00,
            balanceDue: 0
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should send confirmation email with deposit payment', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_confirmation',
          reservation: mockReservation,
          paymentContext: {
            paymentStatus: 'deposit_paid',
            amountPaid: 75.00,
            balanceDue: 75.00
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should send confirmation email for pay on arrival', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_confirmation',
          reservation: mockReservation,
          paymentContext: {
            paymentStatus: 'pay_on_arrival',
            amountPaid: 0,
            balanceDue: 150.00
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should fail if payment context is missing', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_confirmation',
          reservation: mockReservation
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('reservation_update type', () => {
      it('should send update email when dates change', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: mockReservation,
          changeDetails: {
            oldCheckIn: '2025-06-01',
            newCheckIn: '2025-06-02',
            oldCheckOut: '2025-06-05',
            newCheckOut: '2025-06-06'
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should send update email when campsite changes', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: mockReservation,
          changeDetails: {
            oldCampsite: 'Lakeside A1',
            newCampsite: 'Lakeside A2',
            oldCheckIn: '2025-06-01',
            oldCheckOut: '2025-06-05'
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should send update email when both dates and campsite change', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: mockReservation,
          changeDetails: {
            oldCampsite: 'Lakeside A1',
            newCampsite: 'Lakeside A2',
            oldCheckIn: '2025-06-01',
            newCheckIn: '2025-06-02',
            oldCheckOut: '2025-06-05',
            newCheckOut: '2025-06-06'
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should handle unassigned campsite in updates', async () => {
        const reservationWithoutCampsite = {
          ...mockReservation,
          campsite: undefined
        };

        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: reservationWithoutCampsite,
          changeDetails: {
            oldCheckIn: '2025-06-01',
            oldCheckOut: '2025-06-05'
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should fail if change details are missing', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: mockReservation
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('reservation_cancellation type', () => {
      it('should send cancellation email with campsite info', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_cancellation',
          reservation: mockReservation,
          changeDetails: {
            oldCampsite: 'Lakeside A1',
            oldCheckIn: '2025-06-01',
            oldCheckOut: '2025-06-05'
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should send cancellation email using current reservation data if no change details', async () => {
        const params: EmailNotificationParams = {
          type: 'reservation_cancellation',
          reservation: mockReservation
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should handle unassigned campsite in cancellation', async () => {
        const reservationWithoutCampsite = {
          ...mockReservation,
          campsite: undefined
        };

        const params: EmailNotificationParams = {
          type: 'reservation_cancellation',
          reservation: reservationWithoutCampsite
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('custom manage URL', () => {
      it('should use provided manage URL instead of constructing one', async () => {
        const customUrl = 'https://example.com/custom-manage?id=123&token=abc';

        const params: EmailNotificationParams = {
          type: 'reservation_update',
          reservation: mockReservation,
          changeDetails: {
            oldCheckIn: '2025-06-01',
            oldCheckOut: '2025-06-05'
          },
          manageUrl: customUrl
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle email send failures gracefully', async () => {
        // Mock email service to throw error
        const { getResendClient } = await import('@/lib/services/email.service');
        vi.mocked(getResendClient).mockImplementationOnce(() => ({
          emails: {
            send: vi.fn().mockRejectedValue(new Error('SMTP error'))
          }
        } as any));

        const params: EmailNotificationParams = {
          type: 'reservation_confirmation',
          reservation: mockReservation,
          paymentContext: {
            paymentStatus: 'paid',
            amountPaid: 150.00,
            balanceDue: 0
          }
        };

        const result = await sendReservationNotification(params);

        expect(result.sent).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('shouldSendNotification', () => {
    const baseReservation = {
      status: 'confirmed',
      campsite_id: 'site-123',
      check_in: '2025-06-01',
      check_out: '2025-06-05'
    };

    it('should return cancellation type when status changes to cancelled', () => {
      const oldRes = { ...baseReservation, status: 'confirmed' };
      const newRes = { ...baseReservation, status: 'cancelled' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_cancellation');
    });

    it('should not return cancellation type if already cancelled', () => {
      const oldRes = { ...baseReservation, status: 'cancelled' };
      const newRes = { ...baseReservation, status: 'cancelled' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBeNull();
    });

    it('should return update type when check-in date changes', () => {
      const oldRes = { ...baseReservation };
      const newRes = { ...baseReservation, check_in: '2025-06-02' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return update type when check-out date changes', () => {
      const oldRes = { ...baseReservation };
      const newRes = { ...baseReservation, check_out: '2025-06-06' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return update type when campsite changes', () => {
      const oldRes = { ...baseReservation, campsite_id: 'site-123' };
      const newRes = { ...baseReservation, campsite_id: 'site-456' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return update type when campsite is assigned (null to value)', () => {
      const oldRes = { ...baseReservation, campsite_id: null };
      const newRes = { ...baseReservation, campsite_id: 'site-123' };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return update type when campsite is unassigned (value to null)', () => {
      const oldRes = { ...baseReservation, campsite_id: 'site-123' };
      const newRes = { ...baseReservation, campsite_id: null };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return update type when both dates and campsite change', () => {
      const oldRes = { ...baseReservation };
      const newRes = {
        ...baseReservation,
        campsite_id: 'site-456',
        check_in: '2025-06-02',
        check_out: '2025-06-06'
      };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBe('reservation_update');
    });

    it('should return null when no relevant changes occur', () => {
      const oldRes = { ...baseReservation };
      const newRes = { ...baseReservation };

      const result = shouldSendNotification(oldRes, newRes);

      expect(result).toBeNull();
    });

    it('should return null when only non-notification fields change', () => {
      const oldRes = { ...baseReservation };
      const newRes = { ...baseReservation };

      // Status change that's not to cancelled shouldn't trigger notification
      const result = shouldSendNotification(
        { ...oldRes, status: 'pending' },
        { ...newRes, status: 'confirmed' }
      );

      expect(result).toBeNull();
    });

    it('should prioritize cancellation over update when both occur', () => {
      const oldRes = { ...baseReservation, status: 'confirmed' };
      const newRes = {
        ...baseReservation,
        status: 'cancelled',
        check_in: '2025-06-02' // Also changing date
      };

      const result = shouldSendNotification(oldRes, newRes);

      // Cancellation should take priority
      expect(result).toBe('reservation_cancellation');
    });
  });
});
