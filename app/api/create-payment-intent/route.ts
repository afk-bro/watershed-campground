import { NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { checkAvailability } from "@/lib/availability/engine";
import { determinePaymentPolicy, calculatePaymentAmounts } from "@/lib/payment-policy";

// Helper function to calculate total site cost
function calculateTotal(baseRate: string, checkIn: string, checkOut: string): number {
    const rate = parseFloat(baseRate);
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return rate * nights;
}

export async function POST(request: Request) {
    try {
        // 0. Rate Limiting (5 attempts per minute per IP)
        const ip = request.headers.get("x-forwarded-for") || "unknown";
        const allowed = await checkRateLimit(`ip:${ip}:create_pi`, 5, 60);

        if (!allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("STRIPE_SECRET_KEY is missing");
            return NextResponse.json(
                { error: "Payment system configuration missing" },
                { status: 503 }
            );
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-11-17.clover" as any, // Cast to any to avoid strict type mismatch if needed, or use the suggested version
        });

        const { checkIn, checkOut, adults, children, addons = [], campsiteId: requestedSiteId } = await request.json();

        if (!checkIn || !checkOut) {
            return NextResponse.json(
                { error: "Missing required dates" },
                { status: 400 }
            );
        }

        // 1. Check Availability
        // Note: We re-check availability to ensure the spot wasn't taken in the last few seconds
        const availability = await checkAvailability({
            checkIn,
            checkOut,
            guestCount: adults + children,
            campsiteId: requestedSiteId
        });

        if (!availability.available || !availability.recommendedSiteId) {
            return NextResponse.json({ error: "Selected dates are no longer available." }, { status: 409 });
        }

        const campsiteId = availability.recommendedSiteId;

        // 2. Get Campsite Details for Pricing
        const { data: campsite, error: siteError } = await supabaseAdmin
            .from("campsites")
            .select("*")
            .eq("id", campsiteId)
            .single();

        if (siteError || !campsite) {
            console.error("Site fetch error:", siteError);
            return NextResponse.json({ error: "Failed to retrieve campsite details" }, { status: 500 });
        }

        // 3. Calculate Total Amount
        const siteTotal = calculateTotal(campsite.base_rate, checkIn, checkOut);

        // Calculate Add-ons Total
        let addonsTotal = 0;
        // Validate addons if passed (assuming simple array of {id, quantity, price})
        // In a real scenario, we should fetch prices from DB to avoid client-side tampering.
        // For Tier 3 Speed, we will trust but preferably verify. 
        // Let's quickly verify prices if addons exist.
        if (addons.length > 0) {
            const addonIds = addons.map((a: any) => a.id);
            const { data: dbAddons } = await supabaseAdmin.from('addons').select('id, price').in('id', addonIds);

            if (dbAddons) {
                addonsTotal = addons.reduce((sum: number, item: any) => {
                    const dbItem = dbAddons.find((d: any) => d.id === item.id);
                    return sum + ((dbItem?.price || 0) * (item.quantity || 1));
                }, 0);
            }
        }

        const totalAmount = siteTotal + addonsTotal;

        // 4. Determine Payment Policy & Breakdown
        const checkInDate = new Date(checkIn);
        const policy = await determinePaymentPolicy(supabaseAdmin, campsite.id, campsite.type, checkInDate);
        const breakdown = calculatePaymentAmounts(totalAmount, policy, checkInDate);

        // 5. Create Stripe PaymentIntent for DUE NOW amount
        const amountInCents = Math.round(breakdown.dueNow * 100);

        if (amountInCents < 50) {
            return NextResponse.json({ error: "Calculated payment amount is too small" }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "cad",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                campsiteId,
                campsiteName: campsite.name,
                checkIn,
                checkOut,
                reservationType: policy.policy_type,
                policyId: policy.id,
                addonsCount: addons.length,
                siteTotal: siteTotal.toFixed(2),
                addonsTotal: addonsTotal.toFixed(2)
            },
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            breakdown: { ...breakdown, siteTotal, addonsTotal }, // Pass extra details to UI
            campsiteId
        });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
