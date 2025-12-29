/**
 * Payment Service
 *
 * Centralized payment processing logic using Stripe.
 * Handles payment intent creation, verification, and status determination.
 */

import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Json } from "@/lib/database.types";
import { logger } from "@/lib/logger";

/**
 * Payment context for reservation creation
 */
export interface PaymentContext {
  paymentIntentId?: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'deposit_paid' | 'pay_on_arrival';
  amountPaid: number;
  balanceDue: number;
  paymentType: 'full' | 'deposit' | 'cash';
  policySnapshot?: Json | null;
  remainderDueAt?: string | null;
}

/**
 * Result of payment intent verification
 */
export interface PaymentVerificationResult {
  success: boolean;
  paymentIntent?: Stripe.PaymentIntent;
  campsiteId?: string;
  error?: string;
}

/**
 * Options for determining payment status
 */
export interface DeterminePaymentStatusOptions {
  paymentIntent?: Stripe.PaymentIntent;
  paymentMethod?: string;
  totalAmount: number;
  checkIn: string;
  isOffline?: boolean;
}

// Singleton Stripe client with lazy initialization
let stripeClient: Stripe | null = null;

/**
 * Get or initialize Stripe client
 *
 * Lazy initialization prevents build-time errors when STRIPE_SECRET_KEY is not available.
 *
 * @throws Error if STRIPE_SECRET_KEY is not configured
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
    });
  }
  return stripeClient;
}

/**
 * Check if Stripe is configured
 *
 * @returns true if STRIPE_SECRET_KEY is available
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Verify payment intent and extract campsite ID
 *
 * Validates that the payment was successful and contains required metadata.
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @returns Verification result with payment intent and campsite ID
 */
export async function verifyPaymentIntent(
  paymentIntentId: string
): Promise<PaymentVerificationResult> {
  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: 'Payment not verified'
      };
    }

    // Verify campsite metadata exists
    if (!paymentIntent.metadata.campsiteId) {
      return {
        success: false,
        error: 'Invalid payment: missing campsite information'
      };
    }

    return {
      success: true,
      paymentIntent,
      campsiteId: paymentIntent.metadata.campsiteId
    };
  } catch (error) {
    logger.error("Failed to verify payment intent", error, { paymentIntentId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed'
    };
  }
}

/**
 * Determine payment status and context
 *
 * Calculates payment status, amounts paid, and balance due based on payment method
 * and payment intent metadata.
 *
 * @param options - Payment determination options
 * @returns Payment context for reservation creation
 */
export async function determinePaymentStatus(
  options: DeterminePaymentStatusOptions
): Promise<PaymentContext> {
  const { paymentIntent, paymentMethod, totalAmount, checkIn, isOffline } = options;

  const context: PaymentContext = {
    paymentStatus: 'pending',
    amountPaid: 0,
    balanceDue: totalAmount,
    paymentType: 'full',
  };

  // Case 1: Paid via Stripe
  if (paymentIntent) {
    context.paymentIntentId = paymentIntent.id;
    context.paymentStatus = 'paid';
    context.amountPaid = (paymentIntent.amount_received || 0) / 100; // Convert cents to dollars

    // Check if this was a deposit payment
    if (paymentIntent.metadata.policyId) {
      const { data: policy } = await supabaseAdmin
        .from('payment_policies')
        .select('*')
        .eq('id', paymentIntent.metadata.policyId)
        .single();

      if (policy?.policy_type === 'deposit') {
        context.paymentStatus = 'deposit_paid';
        context.paymentType = 'deposit';
        context.policySnapshot = policy as Json;

        // Calculate remainder due date
        if (policy.due_days_before_checkin) {
          const dueDate = new Date(checkIn);
          dueDate.setDate(dueDate.getDate() - policy.due_days_before_checkin);
          context.remainderDueAt = dueDate.toISOString();
        }
      }
    }

    // Calculate balance due
    // Allow for small rounding differences (< $0.50)
    if (context.paymentType === 'full' && Math.abs(totalAmount - context.amountPaid) < 0.50) {
      context.balanceDue = 0;
    } else {
      context.balanceDue = Math.max(0, totalAmount - context.amountPaid);
    }
  }
  // Case 2: Pay in person or offline payment
  else if (paymentMethod === 'in-person' || isOffline) {
    context.paymentMethod = paymentMethod;
    context.paymentType = 'cash';

    if (isOffline) {
      // Admin marked as paid offline
      context.paymentStatus = 'paid';
      context.amountPaid = totalAmount;
      context.balanceDue = 0;
    } else {
      // Pay on arrival
      context.paymentStatus = 'pay_on_arrival';
      context.amountPaid = 0;
      context.balanceDue = totalAmount;
    }
  }

  return context;
}

/**
 * Create a Stripe payment intent
 *
 * @param amount - Amount in dollars (will be converted to cents)
 * @param metadata - Metadata to attach to payment intent
 * @returns Created payment intent
 */
export async function createPaymentIntent(
  amount: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert dollars to cents
    currency: 'usd',
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Update payment intent metadata
 *
 * @param paymentIntentId - Payment intent ID
 * @param metadata - Metadata to update
 */
export async function updatePaymentIntentMetadata(
  paymentIntentId: string,
  metadata: Record<string, string>
): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentIntents.update(paymentIntentId, { metadata });
}
