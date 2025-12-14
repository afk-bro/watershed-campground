"use client";

import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useState } from "react";

export default function PaymentForm({ 
  totalAmount, 
  onSuccess,
  isProcessing: externalProcessing 
}: { 
  totalAmount: number;
  onSuccess: (paymentIntentId: string) => void;
  isProcessing: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState("");
  const [localProcessing, setLocalProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLocalProcessing(true);
    setErrorMessage("");

    // Trigger form validation and wallet collection
    const { error: submitError } = await elements.submit();
    
    if (submitError) {
      setErrorMessage(submitError.message || "An error occurred");
      setLocalProcessing(false);
      return;
    }

    // Confirm Payment 
    // We use redirect: "if_required" so we can handle success inline and close the loop inside current page logic
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/make-a-reservation/confirmation`, 
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed");
      setLocalProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Success! Pass the ID back up
      onSuccess(paymentIntent.id);
      // NOTE: We don't turn off localProcessing, we let the parent handle the next steps
    } else {
        setErrorMessage("Unexpected payment status: " + (paymentIntent?.status || "unknown"));
        setLocalProcessing(false);
    }
  };

  const isBusy = localProcessing || externalProcessing;

  return (
    <div className="bg-white/5 p-6 rounded-xl border border-accent-gold/20 space-y-4">
      <div className="flex justify-between items-center text-accent-beige mb-4">
        <span className="text-lg font-medium">Total to Pay</span>
        <span className="text-2xl font-bold text-accent-gold">
          ${totalAmount.toFixed(2)}
        </span>
      </div>

      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-500/30">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!stripe || !elements || isBusy}
        className="w-full mt-4 bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-4 px-8 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 shadow-lg"
      >
        {isBusy ? "Processing..." : `Pay $${totalAmount.toFixed(2)} & Book`}
      </button>
      
      <p className="text-xs text-center text-accent-beige/50 mt-4">
        Payments secured by Stripe. Your booking is confirmed immediately after payment.
      </p>
    </div>
  );
}
