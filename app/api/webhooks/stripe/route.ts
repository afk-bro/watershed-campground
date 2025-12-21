import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-11-17.clover",
});

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

        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        const result = await handleStripeWebhook(event);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error(`Error processing webhook: ${err.message}`);
        return new NextResponse(`Webhook Handler Error: ${err.message}`, { status: 500 });
    }
}
