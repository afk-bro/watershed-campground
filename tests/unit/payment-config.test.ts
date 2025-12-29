/**
 * Unit tests for payment configuration
 *
 * Tests that PAYMENT_STATUS_CONFIG:
 * - Has entries for all payment statuses
 * - Each entry has required properties (icon, label, color)
 * - getPaymentStatusConfig returns correct configuration
 */

import { describe, it, expect } from 'vitest';
import { PAYMENT_STATUS_CONFIG, getPaymentStatusConfig } from '@/lib/payments/config';
import type { PaymentStatus } from '@/lib/admin/reservations/listing';

describe('PAYMENT_STATUS_CONFIG', () => {
  const allStatuses: PaymentStatus[] = [
    'paid',
    'deposit_paid',
    'payment_due',
    'overdue',
    'failed',
    'refunded',
  ];

  describe('configuration completeness', () => {
    it('should have entries for all payment statuses', () => {
      allStatuses.forEach((status) => {
        expect(PAYMENT_STATUS_CONFIG[status]).toBeDefined();
      });
    });

    it('should have required properties for each status', () => {
      allStatuses.forEach((status) => {
        const config = PAYMENT_STATUS_CONFIG[status];
        expect(config.icon).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.icon).toBe('string');
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });
  });

  describe('getPaymentStatusConfig', () => {
    it('should return correct config for paid status', () => {
      const config = getPaymentStatusConfig('paid');
      expect(config).toEqual({
        icon: '✓',
        label: 'Paid in full',
        color: 'text-green-600/60 dark:text-green-400/60',
      });
    });

    it('should return correct config for deposit_paid status', () => {
      const config = getPaymentStatusConfig('deposit_paid');
      expect(config).toEqual({
        icon: '💳',
        label: 'Deposit paid',
        color: 'text-blue-600/60 dark:text-blue-400/60',
      });
    });

    it('should return correct config for payment_due status', () => {
      const config = getPaymentStatusConfig('payment_due');
      expect(config).toEqual({
        icon: '⏳',
        label: 'Payment due',
        color: 'text-amber-600/80 dark:text-amber-400/80',
      });
    });

    it('should return correct config for overdue status', () => {
      const config = getPaymentStatusConfig('overdue');
      expect(config).toEqual({
        icon: '⚠️',
        label: 'Payment overdue',
        color: 'text-red-600/80 dark:text-red-400/80',
      });
    });

    it('should return correct config for failed status', () => {
      const config = getPaymentStatusConfig('failed');
      expect(config).toEqual({
        icon: '✕',
        label: 'Payment failed',
        color: 'text-red-600/80 dark:text-red-400/80',
      });
    });

    it('should return correct config for refunded status', () => {
      const config = getPaymentStatusConfig('refunded');
      expect(config).toEqual({
        icon: '↩',
        label: 'Refunded',
        color: 'text-gray-600/60 dark:text-gray-400/60',
      });
    });
  });

  describe('configuration consistency', () => {
    it('should use consistent color format (Tailwind classes)', () => {
      allStatuses.forEach((status) => {
        const config = PAYMENT_STATUS_CONFIG[status];
        // Verify color starts with 'text-' (Tailwind text color class)
        expect(config.color).toMatch(/^text-/);
      });
    });

    it('should have non-empty labels', () => {
      allStatuses.forEach((status) => {
        const config = PAYMENT_STATUS_CONFIG[status];
        expect(config.label.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty icons', () => {
      allStatuses.forEach((status) => {
        const config = PAYMENT_STATUS_CONFIG[status];
        expect(config.icon.length).toBeGreaterThan(0);
      });
    });
  });
});
