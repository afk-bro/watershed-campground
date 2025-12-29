/**
 * Unit tests for date utilities
 *
 * Tests behavioral contract:
 * - Parse YYYY-MM-DD strings to local midnight dates
 * - Get current date at local midnight
 * - Avoid UTC timezone issues
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toLocalMidnight, getLocalToday } from '@/lib/date';

describe('date utilities', () => {
  describe('toLocalMidnight', () => {
    it('should parse date string to local midnight', () => {
      const result = toLocalMidnight('2025-01-15');

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January (0-indexed)
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should handle different months correctly', () => {
      const dec = toLocalMidnight('2025-12-25');
      expect(dec.getMonth()).toBe(11); // December (0-indexed)
      expect(dec.getDate()).toBe(25);

      const feb = toLocalMidnight('2025-02-14');
      expect(feb.getMonth()).toBe(1); // February
      expect(feb.getDate()).toBe(14);
    });

    it('should handle leap year dates', () => {
      const leapDay = toLocalMidnight('2024-02-29');
      expect(leapDay.getFullYear()).toBe(2024);
      expect(leapDay.getMonth()).toBe(1);
      expect(leapDay.getDate()).toBe(29);
    });

    it('should handle first day of year', () => {
      const newYear = toLocalMidnight('2025-01-01');
      expect(newYear.getMonth()).toBe(0);
      expect(newYear.getDate()).toBe(1);
    });

    it('should handle last day of year', () => {
      const newYearsEve = toLocalMidnight('2025-12-31');
      expect(newYearsEve.getMonth()).toBe(11);
      expect(newYearsEve.getDate()).toBe(31);
    });

    it('should create Date object in local timezone', () => {
      // Parse same date at midnight - should be local midnight, not UTC
      const result = toLocalMidnight('2025-01-15');

      // If this were UTC parsing, getHours() could be different from 0
      // depending on timezone offset
      expect(result.getHours()).toBe(0);
    });
  });

  describe('getLocalToday', () => {
    beforeEach(() => {
      // Mock Date to return consistent value
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current date at midnight', () => {
      // Set fake time to 3:45 PM on Jan 15, 2025
      vi.setSystemTime(new Date(2025, 0, 15, 15, 45, 30, 123));

      const result = getLocalToday();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return midnight even when called late at night', () => {
      // Set fake time to 11:59 PM
      vi.setSystemTime(new Date(2025, 0, 15, 23, 59, 59, 999));

      const result = getLocalToday();

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return midnight even when called early morning', () => {
      // Set fake time to 12:01 AM
      vi.setSystemTime(new Date(2025, 0, 15, 0, 1, 0, 0));

      const result = getLocalToday();

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });
});
