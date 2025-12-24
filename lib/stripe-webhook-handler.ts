import { supabaseAdmin } from "@/lib/supabase-admin";
import Stripe from "stripe";
import { Resend } from "resend";
import { getBaseUrl } from "@/lib/url-utils";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;
function getResendClient() {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

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

type ReservationRecord = {
    id: string;
    email_sent_at?: string | null;
    first_name: string;
    last_name: string;
    email: string;
    check_in: string;
    check_out: string;
    camping_unit: string;
    adults: number;
    children: number;
    payment_status?: 'pay_on_arrival' | 'deposit_paid' | 'paid' | string | null;
    amount_paid?: number | null;
    balance_due?: number | null;
    status: string;
    stripe_payment_intent_id?: string | null;
};

function isReservationRecord(obj: unknown): obj is ReservationRecord {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return typeof o.id === 'string'
        && typeof o.first_name === 'string'
        && typeof o.last_name === 'string'
        && typeof o.email === 'string'
        && typeof o.check_in === 'string'
        && typeof o.check_out === 'string'
        && typeof o.camping_unit === 'string'
        && typeof o.adults === 'number'
        && typeof o.children === 'number'
        && typeof o.status === 'string';
}

// Helper to send confirmation email
async function sendConfirmationEmail(reservation: ReservationRecord) {
    try {
        // Double check email_sent_at in DB to prevent race conditions from retries
        const { data: latestRes } = await supabaseAdmin
            .from('reservations')
            .select('email_sent_at')
            .eq('id', reservation.id)
            .single();

        if (latestRes?.email_sent_at) {
            console.log(`[Webhook] Email already sent for reservation ${reservation.id}. Skipping.`);
            return { sent: false, reason: 'already_sent' };
        }

        const name = `${reservation.first_name} ${reservation.last_name}`;
        const manageUrl = `${getBaseUrl()}/manage-reservation`;

        // Determine payment message based on payment status
        const paymentMessage = reservation.payment_status === 'pay_on_arrival'
            ? '<p><strong>Payment Method:</strong> Pay in person when you arrive (cash or card accepted)</p>'
            : reservation.payment_status === 'deposit_paid'
                ? `<p><strong>Deposit Received:</strong> $${reservation.amount_paid?.toFixed(2) || '0.00'}<br><strong>Balance Due:</strong> $${reservation.balance_due?.toFixed(2) || '0.00'}</p>`
                : `<p><strong>Payment Received:</strong> $${reservation.amount_paid?.toFixed(2) || '0.00'} - Thank you!</p>`;

        // Send email to guest
        const resend = getResendClient();
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
        await supabaseAdmin
            .from('reservations')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', reservation.id);

        return { sent: true, emailId: emailResult.data?.id };
    } catch (error) {
        console.error(`Failed to send confirmation email for reservation ${reservation.id}:`, error);
        return { sent: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// Helper to handle the business logic of the webhook
export async function handleStripeWebhook(event: Stripe.Event) {
    console.log(`[Stripe] Processing Event: ${event.type} (${event.id})`);

    // 0. Idempotency Check
    const { data: existingEvent } = await supabaseAdmin
        .from('webhook_events')
        .select('status')
        .eq('id', event.id)
        .single();

    if (existingEvent?.status === 'processed' || existingEvent?.status === 'ignored') {
        console.log(`🔹 Event ${event.id} already finished (${existingEvent.status}). Ignoring.`);
        return { received: true, status: 'idempotent_ignore' };
    }

    // Record attempt if new, else allow retry if previously failed or stuck in processing
    if (!existingEvent) {
        await supabaseAdmin.from('webhook_events').insert({
            id: event.id,
            type: event.type,
            status: 'processing',
            metadata: { received_at: new Date().toISOString() }
        });
    } else {
        await supabaseAdmin.from('webhook_events').update({
            status: 'processing',
            metadata: { retried_at: new Date().toISOString() }
        }).eq('id', event.id);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const stripeId = paymentIntent.id;

                console.log(`💰 Payment succeeded for PI: ${stripeId}`);

                // 1. Find reservation by Stripe PI ID
                const { data: reservations, error: findError } = await supabaseAdmin
                    .from('reservations')
                    .select('*')
                    .eq('stripe_payment_intent_id', stripeId);

                if (findError) {
                    console.error("Error finding reservation:", findError);
                    throw findError;
                }

                if (!reservations || reservations.length === 0) {
                    console.warn(`No reservation found for PaymentIntent ${stripeId}`);
                    // Mark as processed but unmatched so we don't retry indefinitely
                    await supabaseAdmin.from('webhook_events')
                        .update({ status: 'processed', metadata: { result: 'unmatched' } })
                        .eq('id', event.id);
                    return { received: true, status: 'unmatched_reservation' };
                }

                const reservation = reservations[0];

                // 2. Update Reservation Status
                if (reservation.status === 'pending') {
                    const { error: updateResError } = await supabaseAdmin
                        .from('reservations')
                        .update({ status: 'confirmed' })
                        .eq('id', reservation.id);

                    if (updateResError) throw updateResError;
                    console.log(`Updated Reservation ${reservation.id} to 'confirmed'`);
                }

                // 3. Update Payment Transaction
                const { error: updateTxError } = await supabaseAdmin
                    .from('payment_transactions')
                    .update({
                        status: 'succeeded',
                        metadata: {
                            webhook_processed_at: new Date().toISOString(),
                            stripe_event_id: event.id
                        }
                    })
                    .eq('stripe_payment_intent_id', stripeId);

                if (updateTxError) throw updateTxError;
                console.log(`Updated Payment Transaction for ${stripeId} to 'succeeded'`);

                // 4. Send Confirmation Email (isReservationRecord helper check if needed)
                if (isReservationRecord(reservation)) {
                    await sendConfirmationEmail(reservation);
                }

                // 5. Finalize Webhook Status
                await supabaseAdmin.from('webhook_events')
                    .update({ status: 'processed', metadata: { result: 'success' } })
                    .eq('id', event.id);

                return { received: true, status: 'processed_success' };
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const stripeId = paymentIntent.id;
                console.log(`❌ Payment failed for PI: ${stripeId}`);

                const { error: failTxError } = await supabaseAdmin
                    .from('payment_transactions')
                    .update({
                        status: 'failed',
                        metadata: {
                            webhook_processed_at: new Date().toISOString(),
                            failure_reason: paymentIntent.last_payment_error?.message,
                            stripe_event_id: event.id
                        }
                    })
                    .eq('stripe_payment_intent_id', stripeId);

                if (failTxError) console.error("Error failing payment transaction:", failTxError);

                await supabaseAdmin.from('webhook_events')
                    .update({ status: 'processed', metadata: { result: 'payment_failed' } })
                    .eq('id', event.id);

                return { received: true, status: 'processed_failure' };
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                await supabaseAdmin.from('webhook_events').update({ status: 'ignored' }).eq('id', event.id);
                return { received: true, status: 'ignored' };
        }
    } catch (err: unknown) {
        console.error(`Error handling event ${event.id}:`, err);
        await supabaseAdmin.from('webhook_events').update({
            status: 'failed',
            metadata: { error: err instanceof Error ? err.message : String(err) }
        }).eq('id', event.id);
        throw err;
    }
}
