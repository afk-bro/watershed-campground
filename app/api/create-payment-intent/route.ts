import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
    checkRateLimit,
    getRateLimitHeaders,
    getClientIp,
    createIpIdentifier,
    rateLimiters
} from "@/lib/rate-limit-upstash";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAvailability } from "@/lib/availability/engine";
import { determinePaymentPolicy, calculatePaymentAmounts } from "@/lib/payment-policy";

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null;
function getStripeClient() {
    if (!stripeClient) {
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2024-12-18.acacia",
        });
    }
    return stripeClient;
}

// Helper function to calculate total site cost
function calculateTotal(baseRate: string, checkIn: string, checkOut: string): number {
    const rate = parseFloat(baseRate);
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return rate * nights;
}

export async function POST(request: Request) {
    try {
        // 0. Rate Limiting (5 attempts per minute per IP via Upstash Redis)
        const ip = getClientIp(request);
        const identifier = createIpIdentifier(ip, 'create-payment-intent');
        const rateLimit = await checkRateLimit(identifier, rateLimiters.paymentIntent);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Too many payment requests. Please try again later." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit)
                }
            );
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("STRIPE_SECRET_KEY is missing");
            return NextResponse.json(
                { error: "Payment system configuration missing" },
                { status: 503 }
            );
        }

        const stripe = getStripeClient();

        const { checkIn, checkOut, adults, children, addons = [], campsiteId: requestedSiteId, paymentMethod = 'full', customDepositAmount } = await request.json() as {
            checkIn: string;
            checkOut: string;
            adults: number;
            children: number;
            addons: Array<{ id: string; quantity: number; price?: number }>;
            campsiteId: string;
            paymentMethod: string;
            customDepositAmount?: number;
        };

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
            const addonIds = addons.map((a: { id: string; quantity: number; price?: number }) => a.id);
            const { data: dbAddons } = await supabaseAdmin.from('addons').select('id, price').in('id', addonIds);

            if (dbAddons) {
                addonsTotal = addons.reduce((sum: number, item: { id: string; quantity: number; price?: number }) => {
                    const dbItem = dbAddons.find((d: { id: string; price: number }) => d.id === item.id);
                    return sum + ((dbItem?.price || 0) * (item.quantity || 1));
                }, 0);
            }
        }

        const totalAmount = siteTotal + addonsTotal;

        // 4. Determine Payment Policy & Breakdown
        const checkInDate = new Date(checkIn);
        const policy = await determinePaymentPolicy(supabaseAdmin, campsite.id, campsite.type, checkInDate);
        let breakdown = calculatePaymentAmounts(totalAmount, policy, checkInDate);

        // Override with custom deposit amount if provided (for deposit payment method)
        if (paymentMethod === 'deposit' && customDepositAmount) {
            if (customDepositAmount < 10) {
                return NextResponse.json({ error: "Deposit amount must be at least $10" }, { status: 400 });
            }
            if (customDepositAmount > totalAmount) {
                return NextResponse.json({ error: "Deposit amount cannot exceed total amount" }, { status: 400 });
            }

            breakdown = {
                ...breakdown,
                dueNow: customDepositAmount,
                dueLater: totalAmount - customDepositAmount,
                depositAmount: customDepositAmount,
                policyApplied: {
                    ...breakdown.policyApplied,
                    policy_type: 'deposit',
                    name: 'Custom Deposit'
                }
            };
        } else if (paymentMethod === 'full') {
            // Force full payment
            breakdown = {
                ...breakdown,
                dueNow: totalAmount,
                dueLater: 0,
                depositAmount: 0,
                policyApplied: {
                    ...breakdown.policyApplied,
                    policy_type: 'full',
                    name: 'Pay in Full'
                }
            };
        }

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

        return NextResponse.json(
            {
                clientSecret: paymentIntent.client_secret,
                breakdown: { ...breakdown, siteTotal, addonsTotal }, // Pass extra details to UI
                campsiteId
            },
            {
                headers: getRateLimitHeaders(rateLimit)
            }
        );
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
