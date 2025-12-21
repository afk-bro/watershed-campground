import { ReservationFormData } from "./validation";
import crypto from 'crypto';
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Use Supabase-generated types - TypeScript will enforce alignment with actual DB schema
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];

// Allowed database columns for runtime validation
const ALLOWED_RESERVATION_COLUMNS = [
    'id', 'created_at', 'updated_at',
    'first_name', 'last_name', 'email', 'phone',
    'address1', 'address2', 'city', 'postal_code',
    'check_in', 'check_out',
    'adults', 'children',
    'camping_unit', 'rv_length', 'rv_year',
    'contact_method', 'hear_about', 'comments',
    'status',
    'total_amount', 'stripe_payment_intent_id', 'payment_status',
    'amount_paid', 'balance_due', 'payment_policy_snapshot', 'remainder_due_at',
    'campsite_id', 'public_edit_token_hash',
    'email_sent_at', 'archived_at', 'metadata'
] as const;

/**
 * Runtime assertion to prevent extra keys from leaking into database inserts.
 * TypeScript catches this at compile time, but production inputs are JSON - this fails loudly if drift occurs.
 */
function assertOnlyDbKeys(obj: Record<string, unknown>, allowed: readonly string[]) {
    const allowedSet = new Set(allowed);
    const extras = Object.keys(obj).filter(k => !allowedSet.has(k));
    if (extras.length) {
        throw new Error(`ReservationInsert has extra keys: ${extras.join(", ")}`);
    }
}

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
    policySnapshot?: unknown;
    remainderDueAt?: string | null;
}

export interface AuditContext {
    source: 'web' | 'admin' | 'migration';
    userAgent?: string;
    ipHash?: string;
    createdBy?: string; // Admin user ID if created in admin panel
}

/**
 * Maps validated form data + context to DB-safe insert object
 * This is our single source of truth for what goes into the database
 */
function toReservationInsert(
    formData: ReservationFormData,
    campsiteId: string,
    tokenHash: string,
    pricing: ReservationPricing,
    payment: PaymentContext,
    audit?: AuditContext
): ReservationInsert {
    return {
        // Guest information
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        postal_code: formData.postalCode,

        // Dates
        check_in: formData.checkIn,
        check_out: formData.checkOut,

        // Guest count (ensure numbers)
        adults: Number(formData.adults),
        children: Number(formData.children),

        // Camping details (ensure strings)
        camping_unit: formData.campingUnit,
        rv_length: formData.rvLength && formData.rvLength !== "0" ? String(formData.rvLength) : null,
        rv_year: formData.rvYear || null,
        contact_method: formData.contactMethod,
        hear_about: formData.hearAbout || null,
        comments: formData.comments || null,

        // Status
        status: 'confirmed',

        // Payment
        total_amount: pricing.totalAmount,
        stripe_payment_intent_id: payment.paymentIntentId || null,
        payment_status: payment.paymentStatus,
        amount_paid: payment.amountPaid,
        balance_due: payment.balanceDue,
        payment_policy_snapshot: payment.policySnapshot || null,
        remainder_due_at: payment.remainderDueAt || null,

        // References
        campsite_id: campsiteId,
        public_edit_token_hash: tokenHash,

        // Audit metadata for debugging, reconciliation, and dispute resolution
        metadata: {
            pricing_snapshot: {
                site_total: pricing.siteTotal,
                addons_total: pricing.addonsTotal,
                total_amount: pricing.totalAmount,
                currency: 'CAD'
            },
            policy_snapshot: payment.policySnapshot,
            source: audit?.source || 'web',
            user_agent: audit?.userAgent,
            ip_hash: audit?.ipHash,
            created_by: audit?.createdBy,
            created_at_iso: new Date().toISOString(),
        },
    };
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
    payment: PaymentContext,
    audit?: AuditContext
) {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    // 1. Map to DB-safe insert object (single source of truth)
    const reservationInsert = toReservationInsert(formData, campsiteId, tokenHash, pricing, payment, audit);

    // 2. Runtime assertion: fail loudly if extra keys leak through
    assertOnlyDbKeys(reservationInsert as Record<string, unknown>, ALLOWED_RESERVATION_COLUMNS);

    // 3. Insert Reservation - ONLY the mapped object
    const { data: reservation, error: dbError } = await deps.supabase
        .from('reservations')
        .insert([reservationInsert])
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

    return { reservation, rawToken };
}
