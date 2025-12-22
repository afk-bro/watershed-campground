import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null;
function getStripeClient() {
    if (!stripeClient) {
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2025-11-17.clover",
        });
    }
    return stripeClient;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    // Casting headers to any to avoid TS conflict with Next.js headers vs Stripe headers expectations
    // const signature = headers().get("stripe-signature") as string;
    const signature = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            // Allow bypass for development testing ONLY if explicitly configured
            // For now, we strictly require signature unless specifically enabling "Public Mock" mode which is risky.
            // Instead, for our verification script, we will unit test the handler directly or mock the signature? 
            // Actually, standard Stripe library requires the secret to be set.
            console.error("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
            return new NextResponse("Webhook Error: Missing signature/secret", { status: 400 });
        }

        const stripe = getStripeClient();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
        console.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
        return new NextResponse(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`, { status: 400 });
    }

    try {
        const result = await handleStripeWebhook(event);
        return NextResponse.json(result);
    } catch (err: unknown) {
        console.error(`Error processing webhook: ${err instanceof Error ? err.message : String(err)}`);
        return new NextResponse(`Webhook Handler Error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
    }
}
