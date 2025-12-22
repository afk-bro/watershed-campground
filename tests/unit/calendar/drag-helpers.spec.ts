import { test, expect } from '@playwright/test';
import { computeDragDates, computeResizeDates, buildGhostState } from '../../../components/admin/calendar/hooks/drag-helpers';
import { Reservation } from '@/lib/supabase';

test.describe('Drag Helpers', () => {
    const monthStart = new Date('2024-01-01');
    const monthEnd = new Date('2024-01-31');

    // Mock Item
    const mockReservation: Reservation = {
        id: '1',
        check_in: '2024-01-05',
        check_out: '2024-01-08',
        campsite_id: 'site1',
        status: 'confirmed',
        created_at: '',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '555-0100',
        address1: '123 Test St',
        city: 'Test City',
        postal_code: '12345',
        camping_unit: 'RV',
        rv_length: '25',
        contact_method: 'Email',
        adults: 1,
        children: 0
    };

    test('computeDragDates calculates correct offset and maintains duration', () => {
        // Dragging 2 days forward (cursor move)
        // If we click on day 0 (start date) and move cursor 2 days forward
        const result = computeDragDates(
            mockReservation,
            0, // Offset days (grabbed at start)
            '2024-01-07', // Cursor now at 7th
            monthStart,
            monthEnd
        );

        expect(result.isValid).toBe(true);
        expect(result.startDate).toBe('2024-01-07');
        expect(result.endDate).toBe('2024-01-10'); // 3 night duration (7,8,9)
    });

    test('computeDragDates respects month boundaries', () => {
        const result = computeDragDates(
            mockReservation,
            0,
            '2023-12-31', // Before month start
            monthStart,
            monthEnd
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Out of month range');
    });

    test('computeResizeDates handles right resize', () => {
        const result = computeResizeDates(
            '2024-01-05',
            '2024-01-08',
            'right',
            '2024-01-09', // Hovering on 9th
            monthStart,
            monthEnd
        );

        // End date should comprise inclusive 5..9? 
        // Logic says: add 1 day to hovered date -> 2024-01-10 (exclusive end)
        expect(result.newStartDate).toBe('2024-01-05');
        expect(result.newEndDate).toBe('2024-01-10');
        expect(result.isValid).toBe(true);
    });

    test('computeResizeDates prevents invalid duration', () => {
        const result = computeResizeDates(
            '2024-01-05',
            '2024-01-08',
            'right',
            '2024-01-05', // Hovering on start date
            monthStart,
            monthEnd
        );
        // End date becomes 2024-01-06 (1 night) -> OK
        expect(result.isValid).toBe(true);

        const invalid = computeResizeDates(
            '2024-01-05',
            '2024-01-08',
            'right',
            '2024-01-04', // Before start
            monthStart,
            monthEnd
        );
        expect(invalid.isValid).toBe(false);
    });

    test('buildGhostState returns correct structure', () => {
        const ghost = buildGhostState('move', 'site1', '2024-01-01', '2024-01-02', null);
        expect(ghost.isValid).toBe(true);
        expect(ghost.mode).toBe('move');
        expect(ghost.errorMessage).toBeUndefined();

        const errorGhost = buildGhostState('move', 'site1', '2024-01-01', '2024-01-02', 'Conflict');
        expect(errorGhost.isValid).toBe(false);
        expect(errorGhost.errorMessage).toBe('Conflict');
    });
});
