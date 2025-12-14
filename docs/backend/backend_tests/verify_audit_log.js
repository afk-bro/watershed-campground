const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
    console.log("Starting Audit Log Verification...");

    const testId = `audit-test-${Date.now()}`;
    let reservationId = null;

    try {
        // 1. Get an active campsite or create one
        const { data: camps, error: campError } = await supabase
            .from('campsites')
            .select('id')
            .eq('is_active', true)
            .limit(1);

        if (campError) throw campError;
        if (camps.length === 0) throw new Error("No active campsites found");
        const campsiteId = camps[0].id;

        // 2. CREATE Reservation
        console.log("Creating Reservation...");
        const { data: res, error: resError } = await supabase
            .from('reservations')
            .insert({
                campsite_id: campsiteId,
                check_in: '2025-10-01',
                check_out: '2025-10-05',
                first_name: 'Audit',
                last_name: 'LogTest',
                email: 'audit@example.com',
                phone: '555-0199',
                address1: '123 Audit Ln',
                city: 'Log City',
                postal_code: '12345',
                adults: 1,
                children: 0,
                rv_length: '0',
                camping_unit: 'tent',
                contact_method: 'email',
                status: 'pending',
                stripe_payment_intent_id: 'pi_audit_verify_' + Date.now(),
                total_amount: 100
            })
            .select()
            .single();

        if (resError) throw resError;
        reservationId = res.id;
        console.log("Reservation Created:", reservationId);

        // 3. UPDATE Reservation
        console.log("Updating Reservation...");
        const { error: updateError } = await supabase
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', reservationId);

        if (updateError) throw updateError;

        // 4. CANCEL Reservation (Update status)
        // Wait a beat to ensure timestamp diff?
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Cancelling Reservation...");
        const { error: cancelError } = await supabase
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId);

        if (cancelError) throw cancelError;

        // 5. Verify Logs
        console.log("Verifying Logs...");
        const { data: logs, error: logError } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('reservation_id', reservationId)
            .order('created_at', { ascending: true });

        if (logError) throw logError;

        console.log(`Found ${logs.length} audit logs.`);

        if (logs.length < 3) {
            console.error("FAIL: Expected at least 3 logs (Insert, Update, Update/Cancel). Found:", logs.length);
            logs.forEach(l => console.log(`- ${l.action} at ${l.created_at}`));
            throw new Error("Insufficient logs");
        }

        // Check types
        const actions = logs.map(l => l.action);
        if (!actions.includes('INSERT')) console.error("Missing INSERT log");
        if (!actions.includes('UPDATE')) console.error("Missing UPDATE log");

        console.log("SUCCESS: Audit logs verified.");
        logs.forEach(l => console.log(`- ${l.action}: ${JSON.stringify(l.new_data?.status || 'N/A')}`));

    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    } finally {
        // Cleanup logs and reservation?
        // Let's keep them for inspection or explicit cleanup
        if (reservationId) {
            console.log("Cleaning up...");
            await supabase.from('reservations').delete().eq('id', reservationId);
            // Logs cascade delete? Yes, defined in schema.
        }
    }
}

runTest();
