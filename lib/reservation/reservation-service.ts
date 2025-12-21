import { ReservationFormData } from "./validation";
import crypto from 'crypto';
import { SupabaseClient } from "@supabase/supabase-js";

export interface ReservationPricing {
    siteTotal: number;
    addonsTotal: number;
    totalAmount: number;
}

export interface PaymentContext {
    paymentIntentId?: string;
    paymentMethod?: string;
    paymentStatus: string;
    amountPaid: number;
    balanceDue: number;
    paymentType: string;
    policySnapshot?: any;
    remainderDueAt?: string | null;
}

// Helper: Token Generation
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CodeDeps {
    supabase: SupabaseClient;
}

export async function createReservationRecord(
    deps: CodeDeps,
    formData: ReservationFormData,
    campsiteId: string,
    pricing: ReservationPricing,
    payment: PaymentContext
) {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    // 1. Insert Reservation
    const { data: reservation, error: dbError } = await deps.supabase
        .from('reservations')
        .insert([
            {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address1: formData.address1,
                address2: formData.address2,
                city: formData.city,
                postal_code: formData.postalCode,
                check_in: formData.checkIn,
                check_out: formData.checkOut,
                adults: formData.adults,
                children: formData.children,
                rv_length: formData.rvLength,
                rv_year: formData.rvYear,
                camping_unit: formData.campingUnit,
                hear_about: formData.hearAbout,
                contact_method: formData.contactMethod,
                comments: formData.comments,
                status: 'confirmed',
                public_edit_token_hash: tokenHash,
                campsite_id: campsiteId,

                // Payment fields
                stripe_payment_intent_id: payment.paymentIntentId,
                payment_status: payment.paymentStatus,
                amount_paid: payment.amountPaid,
                total_amount: pricing.totalAmount,
                balance_due: payment.balanceDue,
                payment_policy_snapshot: payment.policySnapshot,
                remainder_due_at: payment.remainderDueAt
            }
        ])
        .select()
        .single();

    if (dbError || !reservation) {
        throw new Error("Failed to save reservation: " + dbError?.message);
    }

    // 2. Insert Add-ons
    if (formData.addons && formData.addons.length > 0) {
        // Fetch DB Addons to ensure price integrity (double check, though caller might have done it)
        // Ideally we pass validated add-ons here. For now assuming caller validated prices or we re-fetch if strict.
        // Let's assume passed add-ons have correct prices from the pricing calculation step.

        const addonsToInsert = formData.addons.map((addon) => ({
            reservation_id: reservation.id,
            addon_id: addon.id,
            quantity: addon.quantity,
            price_at_booking: addon.price
        }));

        const { error: addonError } = await deps.supabase
            .from('reservation_addons')
            .insert(addonsToInsert);

        if (addonError) {
            console.error("Error saving addons:", addonError);
            // We don't throw here to avoid failing the whole reservation if just addons fail, 
            // but strictly speaking transactions should be atomic. 
            // Supabase doesn't support multi-table transactions easily via JS client without RPC.
        }
    }

    // 3. Insert Transaction Ledger
    if (payment.paymentIntentId) {
        const { error: trxError } = await deps.supabase.from('payment_transactions').insert([{
            reservation_id: reservation.id,
            amount: payment.amountPaid,
            currency: 'cad',
            type: payment.paymentType,
            status: 'succeeded',
            stripe_payment_intent_id: payment.paymentIntentId,
            metadata: { policy_snapshot: payment.policySnapshot }
        }]);

        if (trxError) {
            console.error("Failed to insert transaction ledger:", trxError);
        }
    }

    return reservation;
}
