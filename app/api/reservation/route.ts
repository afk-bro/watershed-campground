import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { checkAvailability } from "@/lib/availability";
import { calculateTotal } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reservationFormSchema } from "@/lib/reservation/validation";
import { createReservationRecord, PaymentContext, AuditContext } from "@/lib/reservation/reservation-service";
import { generateAdminNotificationHtml, generateGuestConfirmationHtml } from "@/lib/email/templates";

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null;
function getStripeClient() {
    if (!stripeClient) {
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: "2025-11-17.clover" as const,
        });
    }
    return stripeClient;
}

export async function POST(request: Request) {
    try {
        // Validate NEXT_PUBLIC_BASE_URL in production
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            if (process.env.NODE_ENV === 'production') {
                console.error("ERROR: NEXT_PUBLIC_BASE_URL environment variable must be set in production.");
                return NextResponse.json(
                    { error: "Server misconfiguration: NEXT_PUBLIC_BASE_URL is required in production." },
                    { status: 500 }
                );
            }
            baseUrl = 'http://localhost:3000';
        }
        const manageUrl = `${baseUrl}/manage-reservation`;

        const body = await request.json();
        const { paymentIntentId, paymentMethod, ...formDataRaw } = body;

        // 1. Validation
        const result = reservationFormSchema.safeParse(formDataRaw);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }
        const formData = result.data;

        // 2. Retrieve Payment Intent & Campsite
        let paymentIntent: Stripe.PaymentIntent | null = null;
        let recommendedSiteId: string;

        if (paymentIntentId) {
            const stripe = getStripeClient();
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
            }
            if (!paymentIntent.metadata.campsiteId) {
                return NextResponse.json({ error: "Invalid payment: missing campsite information" }, { status: 400 });
            }
            recommendedSiteId = paymentIntent.metadata.campsiteId;
        } else {
            // Check availability for non-prepaid bookings
            const availabilityResult = await checkAvailability({
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                guestCount: formData.adults + formData.children,
                campsiteId: formData.campsiteId
            });

            if (!availabilityResult.available || !availabilityResult.recommendedSiteId) {
                return NextResponse.json({ error: "Dates no longer available." }, { status: 400 });
            }
            recommendedSiteId = availabilityResult.recommendedSiteId;
        }

        // 3. Calculate Totals
        const { data: campsite } = await supabaseAdmin
            .from("campsites")
            .select("base_rate, id")
            .eq("id", recommendedSiteId)
            .single();

        if (!campsite) return NextResponse.json({ error: "Campsite not found" }, { status: 500 });

        const siteTotal = calculateTotal(campsite.base_rate, formData.checkIn, formData.checkOut);

        // Verify Add-on Prices
        let addonsTotal = 0;
        let validAddons: Array<{ id: string; quantity: number; price: number }> = [];
        if (Array.isArray(formData.addons) && formData.addons.length > 0) {
            type DbAddon = { id: string; price: number };
            const addonIds = formData.addons
                .filter((a: unknown): a is { id: string; quantity: number } => {
                    return !!a && typeof a === 'object' && 'id' in (a as Record<string, unknown>) && 'quantity' in (a as Record<string, unknown>);
                })
                .map(a => a.id);

            const { data: dbAddons } = await supabaseAdmin
                .from('addons')
                .select('id, price')
                .in('id', addonIds);

            if (Array.isArray(dbAddons)) {
                const dbIndex = new Map<string, number>(dbAddons.map((d: DbAddon) => [d.id, d.price]));
                validAddons = formData.addons
                    .filter((item: unknown): item is { id: string; quantity: number } => {
                        return !!item && typeof item === 'object' && 'id' in (item as Record<string, unknown>) && 'quantity' in (item as Record<string, unknown>);
                    })
                    .map((item) => {
                        const price = dbIndex.get(item.id);
                        return typeof price === 'number' ? { id: item.id, quantity: item.quantity, price } : null;
                    })
                    .filter((x): x is { id: string; quantity: number; price: number } => x !== null);
                addonsTotal = validAddons.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }
        }
        formData.addons = validAddons; // Use verified addons
        const totalAmount = siteTotal + addonsTotal;

        // 4. Determine Payment Status
        const paymentContext: PaymentContext = {
            paymentStatus: 'pending',
            amountPaid: 0,
            balanceDue: 0,
            paymentType: 'full',
            paymentIntentId,
        };

        if (paymentIntent) {
            paymentContext.paymentStatus = 'paid';
            paymentContext.amountPaid = (paymentIntent.amount_received || 0) / 100;

            // Check for Deposit
            if (paymentIntent.metadata.policyId) {
                const { data: policy } = await supabaseAdmin.from('payment_policies').select('*').eq('id', paymentIntent.metadata.policyId).single();
                if (policy?.policy_type === 'deposit') {
                    paymentContext.paymentStatus = 'deposit_paid';
                    paymentContext.paymentType = 'deposit';
                    paymentContext.policySnapshot = policy;
                    if (policy.due_days_before_checkin) {
                        const due = new Date(formData.checkIn);
                        due.setDate(due.getDate() - policy.due_days_before_checkin);
                        paymentContext.remainderDueAt = due.toISOString();
                    }
                }
            }
            // Balance Calc
            if (paymentContext.paymentType === 'full' && Math.abs(totalAmount - paymentContext.amountPaid) < 0.50) {
                paymentContext.balanceDue = 0;
            } else {
                paymentContext.balanceDue = Math.max(0, totalAmount - paymentContext.amountPaid);
            }
        } else if (paymentMethod === 'in-person') {
            paymentContext.paymentStatus = 'pay_on_arrival';
            paymentContext.paymentType = 'cash';
            paymentContext.balanceDue = totalAmount;
        } else {
            return NextResponse.json({ error: "Payment method required" }, { status: 400 });
        }

        // 5. Create Reservation with audit context
        const auditContext: AuditContext = {
            source: 'web',
            userAgent: request.headers.get('user-agent') || undefined,
            // Note: IP hash could be added here with req.headers.get('x-forwarded-for') if needed
        };

        const { reservation, rawToken } = await createReservationRecord(
            { supabase: supabaseAdmin },
            formData,
            recommendedSiteId,
            { siteTotal, addonsTotal, totalAmount },
            paymentContext,
            auditContext
        );

        // Construct magic link with properly encoded query parameters
        const magicLinkUrl = `${manageUrl}?rid=${encodeURIComponent(reservation.id)}&t=${encodeURIComponent(rawToken)}`;

        // 6. Send Emails (Async, don't block response)
        // Only sending critical emails here. Stripe webhooks handle the rest usually, but keeping pay-in-person logic.
        if (paymentMethod === 'in-person') {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const name = `${formData.firstName} ${formData.lastName}`;

            try {
                // Admin Notification
                await resend.emails.send({
                    from: "The Watershed Campground <onboarding@resend.dev>",
                    to: ["info@thewatershedcampground.com"],
                    replyTo: formData.email,
                    subject: `New Reservation Request: ${name}`,
                    html: generateAdminNotificationHtml({ ...formData, confirmationUrl: magicLinkUrl }, name)
                });

                // Guest Confirmation
                await resend.emails.send({
                    from: "The Watershed Campground <onboarding@resend.dev>",
                    to: [formData.email],
                    subject: "Reservation Confirmed",
                    html: generateGuestConfirmationHtml(
                        { ...formData, confirmationUrl: magicLinkUrl },
                        formData.firstName,
                        paymentContext.paymentStatus,
                        paymentContext.amountPaid,
                        paymentContext.balanceDue
                    )
                });
            } catch (emailError) {
                // Log email failure but don't fail the entire request
                console.error("Failed to send reservation emails:", emailError);
                // Note: The reservation was successfully created, but email failed
                // Consider implementing a retry mechanism or background job
            }

            // Update email sent status
            await supabaseAdmin.from('reservations').update({ email_sent_at: new Date().toISOString() }).eq('id', reservation.id);
        }

        return NextResponse.json({
            success: true,
            reservationId: reservation.id,
            message: "Reservation confirmed"
        });

    } catch (error) {
        console.error("Reservation API Error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
        });

        // Return more helpful error message
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({
            error: "Failed to create reservation",
            details: process.env.NODE_ENV === 'production' ? undefined : errorMessage
        }, { status: 500 });
    }
}
