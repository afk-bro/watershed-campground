import { createClient } from '@supabase/supabase-js';
import { handleStripeWebhook } from './lib/stripe-webhook-handler';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
    console.log("Starting Webhook Logic Verification (Bypassing Signature via direct handler call)...");

    // 1. Setup: Create a PENDING reservation
    const testPI = `pi_test_${Date.now()}`;
    const campsiteId = await getActiveCampsiteId();

    if (!campsiteId) throw new Error("No active campsite found");

    const { data: res, error: createError } = await supabase.from('reservations').insert({
        campsite_id: campsiteId,
        first_name: 'Webhook',
        last_name: 'Tester',
        email: 'webhook@example.com',
        check_in: '2025-11-01',
        check_out: '2025-11-03',
        status: 'pending', // Should be flipped to confirmed
        stripe_payment_intent_id: testPI,
        total_amount: 50,
        phone: '123',
        address1: '123 st',
        city: 'City',
        postal_code: '12345',
        camping_unit: 'tent',
        contact_method: 'email',
        adults: 1,
        children: 0,
        rv_length: '0'
    }).select().single();

    if (createError) throw createError;
    console.log(`Created Pending Reservation: ${res.id} (PI: ${testPI})`);

    // Create transaction record too (usually created by payment intent API)
    await supabase.from('payment_transactions').insert({
        reservation_id: res.id,
        amount: 50,
        currency: 'usd',
        status: 'pending',
        type: 'full',
        stripe_payment_intent_id: testPI
    });

    // 2. Simulate Webhook Event
    const mockEvent = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: '2024-12-18',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: testPI,
                object: 'payment_intent',
                amount: 5000,
                currency: 'usd',
                status: 'succeeded'
            } as Stripe.PaymentIntent
        },
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_123', idempotency_key: 'ik_123' },
        type: 'payment_intent.succeeded'
    } as Stripe.Event;

    // 3. Run Handler
    console.log("Invoking handleStripeWebhook...");
    await handleStripeWebhook(mockEvent);

    // 4. Verify State
    const { data: updatedRes } = await supabase.from('reservations').select('status').eq('id', res.id).single();
    const { data: updatedTx } = await supabase.from('payment_transactions').select('status').eq('stripe_payment_intent_id', testPI).single();

    console.log("Verification Results:");
    console.log(`- Reservation Status: ${updatedRes?.status} (Expected: confirmed)`);
    console.log(`- Transaction Status: ${updatedTx?.status} (Expected: succeeded)`);

    if (updatedRes?.status === 'confirmed' && updatedTx?.status === 'succeeded') {
        console.log("SUCCESS: Webhook logic verified.");
    } else {
        console.error("FAIL: State did not update correctly.");
        process.exit(1);
    }

    // Cleanup
    await supabase.from('reservations').delete().eq('id', res.id); // Cascade deletes tx
}

async function getActiveCampsiteId() {
    const { data } = await supabase.from('campsites').select('id').limit(1);
    return data?.[0]?.id;
}

runTest().catch(console.error);
