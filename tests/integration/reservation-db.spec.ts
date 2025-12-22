import { test, expect } from '@playwright/test';
import { createReservationRecord } from '../../lib/reservation/reservation-service';
import { ReservationFormData } from '../../lib/reservation/validation';
import { createClient } from '@supabase/supabase-js';

// Create admin client directly for tests (avoiding 'server-only' import issue)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Integration test suite - runs with real DB connection (admin)
test.describe.serial('Reservation Integration (DB)', () => {

    // Setup: Ensure we have a campsite to book
    let campsiteId: string;

    test.beforeAll(async () => {
        const { data } = await supabaseAdmin.from('campsites').select('id').limit(1).single();
        if (!data) throw new Error("No campsites found in DB for integration test");
        campsiteId = data.id;
    });

    test('creates reservation and ledger entries', async () => {
        const uniqueEmail = `integration-${Date.now()}@test.com`;
        
        // Use unique dates far in the future to avoid conflicts
        // Each test run gets a different date based on timestamp
        const now = new Date();
        const millisOffset = now.getTime() % 365; // 0-364 days offset
        const futureDate = new Date(now);
        futureDate.setFullYear(futureDate.getFullYear() + 3); // 3 years in future
        futureDate.setDate(futureDate.getDate() + millisOffset); // Add unique offset
        
        const checkIn = futureDate.toISOString().split('T')[0];
        
        // Calculate checkout (3 days later)
        const checkOutDate = new Date(futureDate);
        checkOutDate.setDate(checkOutDate.getDate() + 3);
        const checkOut = checkOutDate.toISOString().split('T')[0];

        const formData: ReservationFormData = {
            firstName: "Integration",
            lastName: "Test",
            email: uniqueEmail,
            phone: "555-555-5555",
            address1: "123 Test Lane",
            city: "Testville",
            postalCode: "T3S 1N9",
            checkIn,
            checkOut,
            rvLength: "20",
            adults: 2,
            children: 0,
            campingUnit: "Tent",
            contactMethod: "Email",
            addons: [] // Keep simple for now
        };

        const result = await createReservationRecord(
            { supabase: supabaseAdmin }, // Real DB client
            formData,
            campsiteId,
            { siteTotal: 100, addonsTotal: 0, totalAmount: 100 },
            {
                paymentStatus: 'paid',
                amountPaid: 100,
                balanceDue: 0,
                paymentType: 'full',
                paymentIntentId: `pi_test_${Date.now()}` // Fake stripe ID is fine for DB, we aren't validating with Stripe API here
            }
        );

        expect(result).toBeDefined();
        expect(result.reservation.id).toBeTruthy();
        expect(result.reservation.status).toBe('confirmed');

        // Verify Ledger
        const { data: ledger, error } = await supabaseAdmin
            .from('payment_transactions')
            .select('*')
            .eq('reservation_id', result.reservation.id)
            .single();

        expect(error).toBeNull();
        expect(ledger).toBeDefined();
        expect(ledger.amount).toBe(100);
        expect(ledger.stripe_payment_intent_id).toContain('pi_test_');

        // Cleanup (Optional, but good practice)
        await supabaseAdmin.from('payment_transactions').delete().eq('reservation_id', result.reservation.id);
        await supabaseAdmin.from('reservations').delete().eq('id', result.reservation.id);
    });
});
