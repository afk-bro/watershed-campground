const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

const API_URL = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTest() {
    console.log("Starting Blackout Verification...");

    // 1. Setup Test Dates
    const checkIn = "2026-08-01";
    const checkOut = "2026-08-03";

    // 2. Insert Global Blackout
    console.log(`Inserting blackout for ${checkIn} to ${checkOut}...`);
    const { data: blackout, error: insertError } = await supabase
        .from('blackout_dates')
        .insert({
            start_date: checkIn,
            end_date: checkOut,
            reason: 'Integration Test Blackout'
        })
        .select()
        .single();

    if (insertError) {
        throw new Error("Failed to insert blackout: " + insertError.message);
    }
    console.log("Blackout created:", blackout.id);

    try {
        // 3. Attempt Booking (Should Fail)
        // Need a valid campsite ID? create-payment-intent can find one if we don't pass one,
        // OR we can pass one. Let's just ask for ANY site via the availability check inside the endpoint.
        // We simply pass adults/children/dates.

        console.log("Attempting booking during blackout period...");
        const res = await fetch(`${API_URL}/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                checkIn,
                checkOut,
                adults: 2,
                children: 0
            })
        });

        if (res.status === 409) {
            console.log("PASS: Booking rejected with 409 as expected.");
            const json = await res.json();
            console.log("Error Message:", json.error);
        } else {
            console.error(`FAIL: Expected 409, got ${res.status}`);
            const text = await res.text();
            console.error("Response:", text);
        }

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        // 4. Cleanup
        console.log("Cleaning up blackout record...");
        await supabase.from('blackout_dates').delete().eq('id', blackout.id);
        console.log("Done.");
    }
}

runTest();
