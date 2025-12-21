import { test, expect } from '@playwright/test';

/**
 * Date Overlap Logic Tests
 *
 * Critical for preventing double-bookings. Tests the overlap formula:
 * existing.end > new.start AND existing.start < new.end
 *
 * Checkout dates are EXCLUSIVE (guest checks out in the morning, site becomes available that day)
 */

// Helper function that mimics the database overlap check
function checkDateOverlap(
  existingStart: string,
  existingEnd: string,
  newStart: string,
  newEnd: string
): boolean {
  // Overlap occurs when: existing.check_out > new.check_in AND existing.check_in < new.check_out
  return existingEnd > newStart && existingStart < newEnd;
}

test.describe('Date Overlap Logic (Exclusive Checkout)', () => {

  test('no overlap: new booking starts on existing checkout day', () => {
    // Existing: Jan 1-3 (guest checks out morning of Jan 3)
    // New: Jan 3-5 (guest checks in Jan 3, site is available)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-03', '2025-01-03', '2025-01-05');
    expect(overlap).toBe(false); // No overlap, site is available
  });

  test('no overlap: new booking ends on existing checkin day', () => {
    // New: Jan 1-3 (guest checks out morning of Jan 3)
    // Existing: Jan 3-5 (guest checks in Jan 3)
    const overlap = checkDateOverlap('2025-01-03', '2025-01-05', '2025-01-01', '2025-01-03');
    expect(overlap).toBe(false); // No overlap
  });

  test('overlap: new booking starts 1 day before existing checkout', () => {
    // Existing: Jan 1-3
    // New: Jan 2-4 (starts while existing guest is still there)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-03', '2025-01-02', '2025-01-04');
    expect(overlap).toBe(true); // Overlap!
  });

  test('overlap: new booking completely contains existing booking', () => {
    // Existing: Jan 5-7
    // New: Jan 1-10 (completely covers existing)
    const overlap = checkDateOverlap('2025-01-05', '2025-01-07', '2025-01-01', '2025-01-10');
    expect(overlap).toBe(true); // Overlap!
  });

  test('overlap: existing booking completely contains new booking', () => {
    // Existing: Jan 1-10
    // New: Jan 5-7 (completely within existing)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-10', '2025-01-05', '2025-01-07');
    expect(overlap).toBe(true); // Overlap!
  });

  test('overlap: exact same dates', () => {
    // Both: Jan 1-5
    const overlap = checkDateOverlap('2025-01-01', '2025-01-05', '2025-01-01', '2025-01-05');
    expect(overlap).toBe(true); // Overlap!
  });

  test('no overlap: completely separate date ranges (before)', () => {
    // Existing: Jan 10-15
    // New: Jan 1-5 (ends before existing starts)
    const overlap = checkDateOverlap('2025-01-10', '2025-01-15', '2025-01-01', '2025-01-05');
    expect(overlap).toBe(false); // No overlap
  });

  test('no overlap: completely separate date ranges (after)', () => {
    // Existing: Jan 1-5
    // New: Jan 10-15 (starts after existing ends)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-05', '2025-01-10', '2025-01-15');
    expect(overlap).toBe(false); // No overlap
  });

  test('overlap: new booking starts on same day as existing', () => {
    // Existing: Jan 1-5
    // New: Jan 1-3 (starts same day)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-05', '2025-01-01', '2025-01-03');
    expect(overlap).toBe(true); // Overlap!
  });

  test('overlap: new booking ends on same day as existing', () => {
    // Existing: Jan 1-5
    // New: Jan 3-5 (ends same day)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-05', '2025-01-03', '2025-01-05');
    expect(overlap).toBe(true); // Overlap!
  });

  test('edge case: one-night stays back-to-back', () => {
    // Existing: Jan 1-2 (one night)
    // New: Jan 2-3 (one night, checks in when previous checks out)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-02', '2025-01-02', '2025-01-03');
    expect(overlap).toBe(false); // No overlap, back-to-back is valid
  });

  test('edge case: one-night stay overlaps with multi-night', () => {
    // Existing: Jan 1-5
    // New: Jan 3-4 (one night during existing stay)
    const overlap = checkDateOverlap('2025-01-01', '2025-01-05', '2025-01-03', '2025-01-04');
    expect(overlap).toBe(true); // Overlap!
  });
});

test.describe('Nights Calculation (Exclusive Checkout)', () => {

  function calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  test('one night: Jan 1-2', () => {
    expect(calculateNights('2025-01-01', '2025-01-02')).toBe(1);
  });

  test('two nights: Jan 1-3', () => {
    expect(calculateNights('2025-01-01', '2025-01-03')).toBe(2);
  });

  test('seven nights: week-long stay', () => {
    expect(calculateNights('2025-01-01', '2025-01-08')).toBe(7);
  });

  test('zero nights: same day (invalid booking)', () => {
    expect(calculateNights('2025-01-01', '2025-01-01')).toBe(0);
  });

  test('maximum stay: 21 nights', () => {
    expect(calculateNights('2025-01-01', '2025-01-22')).toBe(21);
  });

  test('cross-month: Jan 30 - Feb 2', () => {
    expect(calculateNights('2025-01-30', '2025-02-02')).toBe(3);
  });

  test('cross-year: Dec 30 - Jan 2', () => {
    expect(calculateNights('2024-12-30', '2025-01-02')).toBe(3);
  });
});
