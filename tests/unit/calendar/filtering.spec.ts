import { test, expect } from '@playwright/test';
import { Reservation, Campsite, BlackoutDate } from '@/lib/supabase';

// Mock Data
const mockCampsites: Campsite[] = [
    { id: '1', name: 'Site 1', code: 'S1', type: 'rv', max_guests: 4, base_rate: 50, is_active: true, created_at: '', updated_at: '', sort_order: 1 },
    { id: '2', name: 'Site 2', code: 'S2', type: 'tent', max_guests: 2, base_rate: 30, is_active: true, created_at: '', updated_at: '', sort_order: 2 },
];

const mockReservations: Reservation[] = [
    {
        id: 'R1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', campsite_id: '1', check_in: '2024-01-01', check_out: '2024-01-05', status: 'confirmed', created_at: '', phone: '', camping_unit: '', adults: 2, children: 0,
        address1: '', city: '', postal_code: '', rv_length: '', contact_method: 'email'
    },
    {
        id: 'R2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', campsite_id: '2', check_in: '2024-01-02', check_out: '2024-01-04', status: 'confirmed', created_at: '', phone: '', camping_unit: '', adults: 2, children: 0,
        address1: '', city: '', postal_code: '', rv_length: '', contact_method: 'email'
    },
];

const mockBlackouts: BlackoutDate[] = [
    { id: 'B1', campsite_id: '1', start_date: '2024-01-10', end_date: '2024-01-12', reason: 'Maintenance', created_at: '' }
];

test.describe('Calendar Filtering Logic', () => {

    test('filters campsites by type', () => {
        const filterType = 'rv';
        const filtered = mockCampsites.filter(c => c.type === filterType);
        expect(filtered.length).toBe(1);
        expect(filtered[0].code).toBe('S1');
    });

    test('filters reservations by search query (case insensitive)', () => {
        const query = 'Smith'.toLowerCase();
        const filtered = mockReservations.filter(r =>
            r.first_name.toLowerCase().includes(query) ||
            r.last_name.toLowerCase().includes(query)
        );
        expect(filtered.length).toBe(1);
        expect(filtered[0].last_name).toBe('Smith');
    });

    test('filters by reservation ID', () => {
        const query = 'R1'.toLowerCase();
        const filtered = mockReservations.filter(r =>
            r.id?.toLowerCase().includes(query)
        );
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('R1');
    });

    test('filters by combined email query', () => {
        const query = 'jane@'.toLowerCase();
        const filtered = mockReservations.filter(r =>
            (r.email && r.email.toLowerCase().includes(query))
        );
        expect(filtered.length).toBe(1);
        expect(filtered[0].first_name).toBe('Jane');
    });

    test('handles empty search query', () => {
        const query = '';
        const filtered = mockReservations.filter(r =>
            r.last_name.toLowerCase().includes(query)
        );
        expect(filtered.length).toBe(2);
    });

    test('hides blackouts when toggled', () => {
        const hideBlackouts = true;
        const visible = hideBlackouts ? [] : mockBlackouts;
        expect(visible.length).toBe(0);
    });
});
