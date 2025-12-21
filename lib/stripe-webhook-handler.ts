import { supabase } from "@/lib/supabase";
import Stripe from "stripe";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to escape HTML
function escapeHtml(unsafe: string) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper to send confirmation email
async function sendConfirmationEmail(reservation: unknown) {
    try {
        // Check if email was already sent (idempotency)
        if (reservation.email_sent_at) {
            console.log(`Email already sent for reservation ${reservation.id} at ${reservation.email_sent_at}`);
            return { sent: false, reason: 'already_sent' };
        }

        const name = `${reservation.first_name} ${reservation.last_name}`;
        const manageUrl = process.env.NEXT_PUBLIC_BASE_URL
            ? `${process.env.NEXT_PUBLIC_BASE_URL}/manage-reservation`
            : 'http://localhost:3000/manage-reservation';

        // Determine payment message based on payment status
        const paymentMessage = reservation.payment_status === 'pay_on_arrival'
            ? '<p><strong>Payment Method:</strong> Pay in person when you arrive (cash or card accepted)</p>'
            : reservation.payment_status === 'deposit_paid'
            ? `<p><strong>Deposit Received:</strong> $${reservation.amount_paid?.toFixed(2) || '0.00'}<br><strong>Balance Due:</strong> $${reservation.balance_due?.toFixed(2) || '0.00'}</p>`
            : `<p><strong>Payment Received:</strong> $${reservation.amount_paid?.toFixed(2) || '0.00'} - Thank you!</p>`;

        // Send email to guest
        const emailResult = await resend.emails.send({
            from: "The Watershed Campground <onboarding@resend.dev>",
            to: [reservation.email],
            subject: "Reservation Confirmed - The Watershed Campground",
            html: `
                <h1>Reservation Confirmed!</h1>
                <p>Hi ${escapeHtml(reservation.first_name)},</p>
                <p>Great news! Your reservation for <strong>${escapeHtml(reservation.check_in)} to ${escapeHtml(reservation.check_out)}</strong> has been confirmed.</p>

                ${paymentMessage}

                <h2>Reservation Details</h2>
                <p><strong>Name:</strong> ${escapeHtml(name)}</p>
                <p><strong>Dates:</strong> ${escapeHtml(reservation.check_in)} to ${escapeHtml(reservation.check_out)}</p>
                <p><strong>Guests:</strong> ${reservation.adults} Adults, ${reservation.children} Children</p>
                <p><strong>Camping Unit:</strong> ${escapeHtml(reservation.camping_unit)}</p>

                <h2>Manage Your Reservation</h2>
                <p>You can view or cancel your reservation using this secure link:</p>
                <p><a href="${escapeHtml(manageUrl)}" style="display: inline-block; background-color: #0b3d2e; color: #e9dfc7; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Reservation</a></p>
                <p style="color: #666; font-size: 14px;">Or copy this link: ${escapeHtml(manageUrl)}</p>
                <p style="color: #666; font-size: 14px;"><strong>Keep this link safe!</strong> Anyone with this link can view and manage your reservation.</p>

                <p>Best regards,<br>The Watershed Campground Team</p>
            `,
        });

        console.log(`✉️ Confirmation email sent to ${reservation.email}:`, emailResult);

        // Mark email as sent
        await supabase
            .from('reservations')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', reservation.id);

        return { sent: true, emailId: emailResult.data?.id };
    } catch (error) {
        console.error(`Failed to send confirmation email for reservation ${reservation.id}:`, error);
        // Don't throw - we don't want to fail the webhook if email fails
        return { sent: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// Helper to handle the business logic of the webhook
export async function handleStripeWebhook(event: Stripe.Event) {
    console.log(`Processing Stripe Event: ${event.type} (${event.id})`);

    // 0. Idempotency Check
    const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('id', event.id)
        .single();

    if (existingEvent) {
        console.log(`🔹 Event ${event.id} already processed. Ignoring.`);
        return { received: true, status: 'idempotent_ignore' };
    }

    // Record attempt (start)
    await supabase.from('webhook_events').insert({ id: event.id, type: event.type, status: 'processing' });

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const stripeId = paymentIntent.id;

                console.log(`💰 Payment succeeded for PI: ${stripeId}`);

                // 1. Find reservation by Stripe PI ID
                // The column in reservations is stripe_payment_intent_id
                const { data: reservations, error: findError } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('stripe_payment_intent_id', stripeId);

                if (findError) {
                    console.error("Error finding reservation:", findError);
                    throw findError;
                }

                if (!reservations || reservations.length === 0) {
                    console.warn(`No reservation found for PaymentIntent ${stripeId}`);
                    // This might happen if the reservation creation failed but payment succeeded, 
                    // or if it's an orphan payment. 
                    // In a robust system, we might create a "Unmatched Payment" record.
                    return { received: true, status: 'unmatched_reservation' };
                }

                const reservation = reservations[0];
                console.log(`✅ Found Reservation: ${reservation.id} (Status: ${reservation.status})`);

                // 2. Update Reservation Status
                // Only update if it's currently pending or if we want to force confirm
                // If it's already 'confirmed', no-op? 
                if (reservation.status === 'pending') {
                    const { error: updateResError } = await supabase
                        .from('reservations')
                        .update({ status: 'confirmed' })
                        .eq('id', reservation.id);

                    if (updateResError) {
                        console.error("Error updating reservation status:", updateResError);
                        throw updateResError;
                    }
                    console.log(`Updated Reservation ${reservation.id} to 'confirmed'`);
                }

                // 3. Update Payment Transaction
                // There should be a 'pending' transaction in payment_transactions
                // keyed by reservation_id? Or do we have a stripe_payment_intent_id in transactions too?
                // Checking schema dump... payment_transactions has reservation_id, stripe_payment_intent_id.

                const { error: updateTxError } = await supabase
                    .from('payment_transactions')
                    .update({
                        status: 'succeeded',
                        metadata: { webhook_processed_at: new Date().toISOString() }
                    })
                    .eq('stripe_payment_intent_id', stripeId);

                if (updateTxError) {
                    console.error("Error updating payment transaction:", updateTxError);
                    throw updateTxError;
                }
                console.log(`Updated Payment Transaction for ${stripeId} to 'succeeded'`);

                // 4. Send Confirmation Email (if not already sent)
                await sendConfirmationEmail(reservation);

                return { received: true, status: 'processed_success' };
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const stripeId = paymentIntent.id;
                console.log(`❌ Payment failed for PI: ${stripeId}`);

                // 1. Update Transaction to failed
                const { error: failTxError } = await supabase
                    .from('payment_transactions')
                    .update({
                        status: 'failed',
                        metadata: {
                            webhook_processed_at: new Date().toISOString(),
                            failure_reason: paymentIntent.last_payment_error?.message
                        }
                    })
                    .eq('stripe_payment_intent_id', stripeId);

                if (failTxError) {
                    console.error("Error failing payment transaction:", failTxError);
                    // Don't throw, just log
                }

                // 2. We probably don't cancel the reservation immediately on first failure?
                // Or maybe we do if it was the initial deposit?
                // Let's leave reservation as 'pending' (it catches unpaid ones later) or mock 'failed' state?
                // Only schema valid statuses: pending, confirmed, cancelled... no 'failed'.
                // So we leave it as pending.

                return { received: true, status: 'processed_failure' };
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                await supabase.from('webhook_events').update({ status: 'ignored' }).eq('id', event.id);
                return { received: true, status: 'ignored' };
        }
    } catch (err: unknown) {
        console.error(`Error handling event ${event.id}:`, err);
        await supabase.from('webhook_events').update({ status: 'failed' }).eq('id', event.id);
        throw err;
    }
}
