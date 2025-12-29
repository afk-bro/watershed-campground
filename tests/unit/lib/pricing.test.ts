/**
 * Unit tests for pricing calculations
 *
 * Tests behavioral contract:
 * - Calculate total cost based on nightly rate and stay duration
 * - Calculate addon totals with quantities
 * - Handle date inputs as strings or Date objects
 * - Round to 2 decimal places for currency
 */

import { describe, it, expect } from 'vitest';
import { calculateTotal, calculateAddonTotal } from '@/lib/pricing';

describe('pricing', () => {
  describe('calculateTotal', () => {
    it('should calculate total for single night', () => {
      const total = calculateTotal(50, '2025-01-15', '2025-01-16');
      expect(total).toBe(50);
    });

    it('should calculate total for multiple nights', () => {
      const total = calculateTotal(75, '2025-01-15', '2025-01-20');
      // 5 nights at $75/night = $375
      expect(total).toBe(375);
    });

    it('should calculate total for week-long stay', () => {
      const total = calculateTotal(100, '2025-01-01', '2025-01-08');
      // 7 nights at $100/night = $700
      expect(total).toBe(700);
    });

    it('should handle Date objects as input', () => {
      const checkIn = new Date(2025, 0, 15); // Jan 15
      const checkOut = new Date(2025, 0, 18); // Jan 18
      const total = calculateTotal(60, checkIn, checkOut);
      // 3 nights at $60/night = $180
      expect(total).toBe(180);
    });

    it('should handle mixed Date and string inputs', () => {
      const checkIn = new Date(2025, 0, 15);
      const total = calculateTotal(80, checkIn, '2025-01-17');
      // 2 nights at $80/night = $160
      expect(total).toBe(160);
    });

    it('should return 0 for same-day check-in/check-out', () => {
      const total = calculateTotal(100, '2025-01-15', '2025-01-15');
      expect(total).toBe(0);
    });

    it('should return 0 for check-out before check-in', () => {
      const total = calculateTotal(100, '2025-01-20', '2025-01-15');
      expect(total).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Using a rate that will create decimals
      const total = calculateTotal(33.33, '2025-01-15', '2025-01-18');
      // 3 nights at $33.33 = $99.99
      expect(total).toBe(99.99);
    });

    it('should handle fractional rates correctly', () => {
      const total = calculateTotal(45.50, '2025-01-15', '2025-01-20');
      // 5 nights at $45.50 = $227.50
      expect(total).toBe(227.5);
    });

    it('should calculate across month boundaries', () => {
      const total = calculateTotal(50, '2025-01-30', '2025-02-02');
      // 3 nights
      expect(total).toBe(150);
    });

    it('should calculate across year boundaries', () => {
      const total = calculateTotal(100, '2024-12-30', '2025-01-02');
      // 3 nights
      expect(total).toBe(300);
    });
  });

  describe('calculateAddonTotal', () => {
    it('should calculate total for single addon', () => {
      const addons = [
        { id: 'firewood', price: 10, quantity: 1 }
      ];
      expect(calculateAddonTotal(addons)).toBe(10);
    });

    it('should calculate total for addon with multiple quantities', () => {
      const addons = [
        { id: 'firewood', price: 10, quantity: 3 }
      ];
      expect(calculateAddonTotal(addons)).toBe(30);
    });

    it('should calculate total for multiple different addons', () => {
      const addons = [
        { id: 'firewood', price: 10, quantity: 2 },
        { id: 'ice', price: 5, quantity: 1 },
        { id: 'propane', price: 15, quantity: 1 }
      ];
      // (10 * 2) + (5 * 1) + (15 * 1) = 20 + 5 + 15 = 40
      expect(calculateAddonTotal(addons)).toBe(40);
    });

    it('should return 0 for empty addon list', () => {
      expect(calculateAddonTotal([])).toBe(0);
    });

    it('should handle zero quantity', () => {
      const addons = [
        { id: 'firewood', price: 10, quantity: 0 }
      ];
      expect(calculateAddonTotal(addons)).toBe(0);
    });

    it('should handle fractional prices', () => {
      const addons = [
        { id: 'item', price: 7.50, quantity: 3 }
      ];
      expect(calculateAddonTotal(addons)).toBe(22.5);
    });

    it('should round to 2 decimal places', () => {
      const addons = [
        { id: 'item1', price: 3.33, quantity: 2 },
        { id: 'item2', price: 5.50, quantity: 1 }
      ];
      // (3.33 * 2) + (5.50 * 1) = 6.66 + 5.50 = 12.16
      expect(calculateAddonTotal(addons)).toBe(12.16);
    });

    it('should handle large quantities', () => {
      const addons = [
        { id: 'bulk-item', price: 2.50, quantity: 100 }
      ];
      expect(calculateAddonTotal(addons)).toBe(250);
    });

    it('should calculate correctly with mix of quantities', () => {
      const addons = [
        { id: 'cheap', price: 1, quantity: 5 },
        { id: 'expensive', price: 50, quantity: 2 },
        { id: 'medium', price: 10.50, quantity: 3 }
      ];
      // (1 * 5) + (50 * 2) + (10.50 * 3) = 5 + 100 + 31.50 = 136.50
      expect(calculateAddonTotal(addons)).toBe(136.5);
    });
  });
});
