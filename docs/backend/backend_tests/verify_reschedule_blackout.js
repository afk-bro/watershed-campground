const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
require('dotenv').config({ path: '.env.local' });

// Load env vars
// In this environment, we might need to load from .env.local if not present in process
// But usually verification scripts run with `node --env-file=.env.local` or similar, or I just hardcode for the test if safe (it's not).
// I'll assume standard processing.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing env vars.");
    console.log("Details:", {
        URL: !!supabaseUrl,
        ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
        SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
    console.log("Starting Reschedule Blackout Verification...");

    const testId = `test-${Date.now()}`;
    let campsiteId = null;
    let reservationId = null;
    let blackoutId = null;

    try {
        // 1. Get an active campsite or create one
        const { data: camps, error: campError } = await supabase
            .from('campsites')
            .select('id')
            .eq('is_active', true)
            .limit(1);

        if (campError) throw campError;
        if (camps.length === 0) throw new Error("No active campsites found");
        campsiteId = camps[0].id;

        console.log("Using Campsite:", campsiteId);

        // 2. Create a Reservation (safe date)
        const checkIn = '2025-05-01';
        const checkOut = '2025-05-05';

        const { data: res, error: resError } = await supabase
            .from('reservations')
            .insert({
                campsite_id: campsiteId,
                check_in: checkIn,
                check_out: checkOut,
                first_name: 'Test',
                last_name: 'Reschedule',
                email: 'test@example.com',
                phone: '1234567890',
                address1: '123 Test St',
                city: 'Testville',
                postal_code: '12345',
                adults: 1,
                children: 0,
                rv_length: '0',
                camping_unit: 'tent',
                contact_method: 'email',
                status: 'pending',
                stripe_payment_intent_id: 'test_pi_verification_' + Date.now(),
                total_amount: 100
            })
            .select()
            .single();

        if (resError) throw resError;
        reservationId = res.id;
        console.log("Created Reservation:", reservationId);

        // 3. Create a Blackout Date (conflicting with TARGET dates)
        // Target Move: 2025-06-01 to 2025-06-05
        // Blackout: 2025-06-02 to 2025-06-03 (Inside target)

        const targetCheckIn = '2025-06-01';
        const targetCheckOut = '2025-06-05';
        const blackoutStart = '2025-06-02';
        const blackoutEnd = '2025-06-03';

        const { data: blackout, error: bError } = await supabase
            .from('blackout_dates')
            .insert({
                start_date: blackoutStart,
                end_date: blackoutEnd,
                reason: 'Verification Test Blackout',
                campsite_id: campsiteId
            })
            .select()
            .single();

        if (bError) throw bError;
        blackoutId = blackout.id;
        console.log("Created Blackout:", blackoutId);

        // 4. Attempt Reschedule via API (simulated fetch)
        // We can't easily fetch localhost API from this script unless API is running.
        // But we are in the dev environment. I can invoke the PATCH logic?
        // No, I should curl the API ideally, or assumes API is running.
        // If API is not running, I can assume failure.
        // Alternatively, I can test the QUERY logic directly using Supabase client here?
        // Testing the API ENDPOINT is better integration test.
        // I will attempt `fetch` to localhost:3000.

        console.log("Attempting to Reschedule to Blackout Period...");
        const response = await fetch(`http://localhost:3000/api/admin/reservations/${reservationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                check_in: targetCheckIn,
                check_out: targetCheckOut
            })
        });

        console.log("Response Status:", response.status);

        if (response.status === 409) {
            console.log("SUCCESS: Reschedule rejected with 409 Conflict.");
            const json = await response.json();
            console.log("Error Message:", json.error);
        } else if (response.status === 200) {
            console.error("FAIL: Reschedule succeeded despite blackout!");
            throw new Error("Reschedule succeeded despite blackout");
        } else {
            console.log("Response:", await response.text());
            throw new Error(`Unexpected status: ${response.status}`);
        }

    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    } finally {
        // Cleanup
        console.log("Cleaning up...");
        if (blackoutId) await supabase.from('blackout_dates').delete().eq('id', blackoutId);
        if (reservationId) await supabase.from('reservations').delete().eq('id', reservationId);
    }
}

runTest();
