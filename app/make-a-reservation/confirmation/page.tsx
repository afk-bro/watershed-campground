"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import Container from "@/components/Container";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

if (!stripeKey) {
  console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in environment variables.");
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const clientSecret = searchParams.get("payment_intent_client_secret");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    if (!paymentIntentId || !clientSecret) {
      // Invalid link: skip effect work; rendering handles the error branch
      return;
    }

    const finalizeReservation = async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe) return;

        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

        if (paymentIntent && paymentIntent.status === "succeeded") {
            // Payment Success! Now check if we need to save the reservation.
            // Try to load from Session Storage
            const savedData = sessionStorage.getItem("pendingReservation");
            
            if (savedData) {
                setMessage("Finalizing reservation...");
                const { formData, selectedAddons, availableAddons } = JSON.parse(savedData);
                
                // Reconstruct payload
                // Need to map selectedAddons back to array format
                type Addon = { id: string; price: number };
                const isAddon = (a: unknown): a is Addon => {
                  return !!a && typeof a === 'object' && 'id' in (a as Record<string, unknown>) && 'price' in (a as Record<string, unknown>)
                    && typeof (a as Record<string, unknown>).id === 'string' && typeof (a as Record<string, unknown>).price === 'number';
                };

                const addonsPayload = Object.entries(selectedAddons)
                  .filter(([, qty]) => (qty as number) > 0)
                  .map(([id, qty]) => {
                      const addon = availableAddons.find((a: unknown) => isAddon(a) && a.id === id);
                      const price = isAddon(addon) ? addon.price : 0;
                      return { id, quantity: qty, price };
                  });

                const response = await fetch("/api/reservation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                       ...formData,
                       addons: addonsPayload,
                       paymentIntentId: paymentIntent.id
                    }),
                });
                
                if (response.ok) {
                   sessionStorage.removeItem("pendingReservation");
                   setStatus("success");
                   setMessage("Reservation Confirmed!");
                } else {
                   const errData = await response.json();
                   if (errData.error && errData.error.includes("duplicate")) {
                       // Already saved?
                       setStatus("success"); 
                   } else {
                       setStatus("error");
                       setMessage("Payment succeeded, but reservation save failed: " + errData.error);
                   }
                }
            } else {
                // No session data (maybe opened in new tab or cleared).
                // Check if reservation exists via some other lookup?
                // For now, assume if no session data, we can't save the row.
                // But the user has PAID.
                setStatus("success"); // Show success but warn?
                setMessage("Payment Successful.");
                // TODO: Look up if reservation exists by PI ID?
            }

        } else {
          setStatus("error");
          setMessage("Payment verification failed. Status: " + paymentIntent?.status);
        }
      } catch (err: unknown) {
        console.error(err);
        setStatus("error");
        setMessage("An error occurred verifying your reservation.");
      }
    };

    void finalizeReservation();
  }, [paymentIntentId, clientSecret]);

  // Invalid payment intent link: render error immediately without setting state in effect
  if (!paymentIntentId || !clientSecret) {
    return (
      <div className="text-center py-20">
        <div className="text-rose-400 w-12 h-12 border-4 border-rose-400 border-t-transparent rounded-full mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-accent-gold">Invalid payment link.</h2>
        <p className="mt-4 text-accent-beige/80">Please return to the reservation page and try again.</p>
        <div className="mt-8">
          <Link href="/make-a-reservation" className="inline-block bg-brand-forest hover:bg-brand-forest-light border border-accent-gold/30 text-accent-beige px-8 py-3 rounded-lg transition-colors">Back to Reservation</Link>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
        <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-accent-gold">{message}</h2>
        </div>
    );
  }

  if (status === "error") {
      return (
        <div className="text-center py-20">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-accent-beige mb-8">{message}</p>
            <p className="text-sm text-accent-beige/60">If you have been charged, please contact support with ID: {paymentIntentId}</p>
             <Link href="/contact" className="inline-block mt-6 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg text-accent-beige">
                Contact Support
            </Link>
        </div>
      );
  }

  return (
    <div className="text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2 className="font-heading text-4xl text-accent-gold">Reservation Confirmed!</h2>
        <p className="text-accent-beige/90 text-lg max-w-lg mx-auto">
            {message}
        </p>
        <p className="text-sm text-accent-beige/60">Reference: {paymentIntentId}</p>
        <div className="pt-8">
                <Link href="/" className="inline-block bg-brand-forest hover:bg-brand-forest-light border border-accent-gold/30 text-accent-beige px-8 py-3 rounded-lg transition-colors">
                Return Home
                </Link>
        </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-brand-dark">
      <div className="pt-32 pb-16">
        <Container>
            <Suspense fallback={<div className="text-center text-accent-gold">Loading...</div>}>
                <ConfirmationContent />
            </Suspense>
        </Container>
      </div>
    </main>
  );
}
