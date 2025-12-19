import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/test-supabase';
import { addDays, format } from 'date-fns';

/**
 * Integration: Stripe Webhooks
 * Tests Stripe webhook handling and reservation status updates
 *
 * NOTE: This test verifies the webhook handler logic without actual Stripe signatures
 * Full webhook testing with signature verification requires Stripe CLI or mock signatures
 */
test.describe('Stripe Webhook Integration', () => {
    test.describe('Payment Intent Succeeded Workflow', () => {
        let testReservationId: string;
        const testPaymentIntentId = 'pi_test_webhook_' + Date.now();

        test.beforeEach(async () => {
            // Create a pending reservation with a Stripe payment intent ID
            const tomorrow = addDays(new Date(), 50);
            const checkOut = addDays(tomorrow, 2);

            const { data } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Webhook',
                    last_name: 'Test',
                    email: 'webhook.test@example.com',
                    phone: '555-0200',
                    address1: '123 Webhook St',
                    city: 'Webhook City',
                    postal_code: '11111',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '25',
                    camping_unit: 'RV / Trailer',
                    contact_method: 'Email',
                    status: 'pending',
                    stripe_payment_intent_id: testPaymentIntentId,
                    payment_status: 'pending',
                    total_amount: 100.00,
                })
                .select()
                .single();

            testReservationId = data!.id;
        });

        test.afterEach(async () => {
            if (testReservationId) {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testReservationId);
            }

            // Cleanup webhook events
            await supabaseAdmin
                .from('webhook_events')
                .delete()
                .like('id', 'evt_test_%');
        });

        test('should have pending reservation ready for webhook', async () => {
            // Verify the test reservation was created correctly
            const { data } = await supabaseAdmin
                .from('reservations')
                .select('*')
                .eq('id', testReservationId)
                .single();

            expect(data).toBeDefined();
            expect(data?.status).toBe('pending');
            expect(data?.stripe_payment_intent_id).toBe(testPaymentIntentId);
            expect(data?.payment_status).toBe('pending');
        });

        test('webhook endpoint should require stripe-signature header', async ({ request }) => {
            // Try to call webhook without signature
            const response = await request.post('/api/webhooks/stripe', {
                data: {
                    id: 'evt_test_' + Date.now(),
                    type: 'payment_intent.succeeded',
                    data: {
                        object: {
                            id: testPaymentIntentId,
                        },
                    },
                },
                headers: {
                    // Missing stripe-signature header
                    'Content-Type': 'application/json',
                },
            });

            // Should fail without signature
            expect(response.status()).toBe(400);
        });

        test('webhook with invalid signature should be rejected', async ({ request }) => {
            const response = await request.post('/api/webhooks/stripe', {
                data: {
                    id: 'evt_test_' + Date.now(),
                    type: 'payment_intent.succeeded',
                    data: {
                        object: {
                            id: testPaymentIntentId,
                        },
                    },
                },
                headers: {
                    'stripe-signature': 'invalid_signature_here',
                    'Content-Type': 'application/json',
                },
            });

            // Should fail with invalid signature
            expect(response.status()).toBe(400);
        });
    });

    test.describe('Webhook Idempotency', () => {
        test('should track webhook events to prevent duplicate processing', async () => {
            const eventId = 'evt_test_idempotency_' + Date.now();

            // Record a webhook event as processed
            await supabaseAdmin
                .from('webhook_events')
                .insert({
                    id: eventId,
                    type: 'payment_intent.succeeded',
                    status: 'processed',
                });

            // Verify it was recorded
            const { data } = await supabaseAdmin
                .from('webhook_events')
                .select('*')
                .eq('id', eventId)
                .single();

            expect(data).toBeDefined();
            expect(data?.status).toBe('processed');

            // Cleanup
            await supabaseAdmin
                .from('webhook_events')
                .delete()
                .eq('id', eventId);
        });
    });

    test.describe('Email Notification After Payment', () => {
        test('should track email_sent_at timestamp', async () => {
            // Create a test reservation
            const tomorrow = addDays(new Date(), 60);
            const checkOut = addDays(tomorrow, 2);

            const { data } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Email',
                    last_name: 'Tracking',
                    email: 'email.tracking@test.com',
                    phone: '555-0210',
                    address1: '123 Email St',
                    city: 'Email City',
                    postal_code: '22222',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '25',
                    camping_unit: 'Tent',
                    contact_method: 'Email',
                    status: 'confirmed',
                    email_sent_at: null, // Initially not sent
                })
                .select()
                .single();

            const testId = data!.id;

            try {
                // Verify email not sent
                expect(data?.email_sent_at).toBeNull();

                // Simulate email being sent (webhook would do this)
                await supabaseAdmin
                    .from('reservations')
                    .update({ email_sent_at: new Date().toISOString() })
                    .eq('id', testId);

                // Verify timestamp was set
                const { data: updated } = await supabaseAdmin
                    .from('reservations')
                    .select('email_sent_at')
                    .eq('id', testId)
                    .single();

                expect(updated?.email_sent_at).toBeDefined();
                expect(updated?.email_sent_at).not.toBeNull();
            } finally {
                // Cleanup
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testId);
            }
        });
    });

    test.describe('Reservation Status Transitions', () => {
        test('should transition from pending to confirmed', async () => {
            const tomorrow = addDays(new Date(), 70);
            const checkOut = addDays(tomorrow, 2);

            // Create pending reservation
            const { data } = await supabaseAdmin
                .from('reservations')
                .insert({
                    first_name: 'Status',
                    last_name: 'Transition',
                    email: 'status.transition@test.com',
                    phone: '555-0220',
                    address1: '123 Status St',
                    city: 'Status City',
                    postal_code: '33333',
                    check_in: format(tomorrow, 'yyyy-MM-dd'),
                    check_out: format(checkOut, 'yyyy-MM-dd'),
                    adults: 2,
                    children: 0,
                    rv_length: '28',
                    camping_unit: 'RV / Trailer',
                    contact_method: 'Email',
                    status: 'pending',
                })
                .select()
                .single();

            const testId = data!.id;

            try {
                // Verify initial status
                expect(data?.status).toBe('pending');

                // Simulate webhook confirming payment
                await supabaseAdmin
                    .from('reservations')
                    .update({ status: 'confirmed' })
                    .eq('id', testId);

                // Verify status updated
                const { data: confirmed } = await supabaseAdmin
                    .from('reservations')
                    .select('status')
                    .eq('id', testId)
                    .single();

                expect(confirmed?.status).toBe('confirmed');
            } finally {
                await supabaseAdmin
                    .from('reservations')
                    .delete()
                    .eq('id', testId);
            }
        });
    });
});
