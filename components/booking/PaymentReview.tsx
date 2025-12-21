"use client";

import { PaymentBreakdown, FormData } from "@/lib/booking/booking-types";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "@/components/PaymentForm";
import { Stripe } from "@stripe/stripe-js";

interface PaymentReviewProps {
  breakdown: PaymentBreakdown | null;
  formData: FormData;
  clientSecret: string;
  stripePromise: Promise<Stripe | null>;
  onSuccess: (paymentIntentId: string) => void;
  isProcessing: boolean;
  onBack: () => void;
}

export default function PaymentReview({
  breakdown,
  formData,
  clientSecret,
  stripePromise,
  onSuccess,
  isProcessing,
  onBack
}: PaymentReviewProps) {

  return (
      <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-6 sm:p-10 space-y-8">
              <h3 className="font-heading text-2xl text-accent-gold text-center">Review & Pay</h3>

              {breakdown && (
                  <div className="bg-brand-forest/50 p-6 rounded-lg border border-accent-gold/20 space-y-4">
                      <div className="flex justify-between text-accent-beige/80">
                          <span>Site Cost ({formData.checkIn} to {formData.checkOut}):</span>
                          <span>${breakdown.siteTotal}</span>
                      </div>
                      {breakdown.addonsTotal > 0 && (
                          <div className="flex justify-between text-accent-beige/80">
                              <span>Add-ons Total:</span>
                              <span>${breakdown.addonsTotal}</span>
                          </div>
                      )}
                      <div className="border-t border-white/5 my-2"></div>
                      <div className="flex justify-between text-accent-beige font-medium text-lg">
                          <span>Grand Total:</span>
                          <span>${breakdown.totalAmount.toFixed(2)}</span>
                      </div>
                      
                      {breakdown.depositAmount < breakdown.totalAmount && (
                         <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/20 rounded">
                          <div className="flex justify-between text-accent-beige/90">
                              <span>Due Now (Deposit):</span>
                              <span className="text-accent-gold font-bold text-xl">${breakdown.dueNow.toFixed(2)}</span>
                          </div>
                           <div className="flex justify-between text-accent-beige/60 text-sm pt-1">
                              <span>Balance Due Later:</span>
                              <span>${breakdown.dueLater.toFixed(2)}</span>
                          </div>
                          {breakdown.remainderDueAt && (
                              <div className="text-right text-xs text-accent-beige/40 mt-1">
                                 Due by {new Date(breakdown.remainderDueAt).toLocaleDateString()}
                              </div>
                          )}
                         </div>
                      )}
                  </div>
              )}

              {clientSecret && breakdown && (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                      <PaymentForm 
                         totalAmount={breakdown.dueNow || 0}
                         onSuccess={onSuccess}
                         isProcessing={isProcessing}
                      />
                  </Elements>
              )}
              
              <div className="text-center pt-4">
                 <button type="button" onClick={onBack} className="text-sm text-accent-beige/50 hover:text-accent-gold underline">
                     Go Back to Add-ons
                 </button>
              </div>
          </div>
      </div>
  );
}
