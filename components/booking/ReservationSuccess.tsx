"use client";

import Link from "next/link";
import { FormData, PaymentMethod } from "@/lib/booking/booking-types";

interface ReservationSuccessProps {
  formData: FormData;
  paymentMethod: PaymentMethod;
}

export default function ReservationSuccess({
  formData,
  paymentMethod
}: ReservationSuccessProps) {
  return (
    <div className="max-w-3xl mx-auto text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2 className="font-heading text-4xl text-accent-gold">Reservation Confirmed!</h2>
        <p className="text-accent-beige/90 text-lg max-w-lg mx-auto">
            Thank you, {formData.firstName}. {paymentMethod === 'in-person'
                ? 'Your reservation has been secured. Payment will be collected when you arrive.'
                : paymentMethod === 'deposit'
                ? 'We have received your deposit and secured your spot. The remaining balance will be due before your arrival.'
                : 'We have received your payment and secured your spot.'
            }
        </p>
        <p className="text-accent-beige/70 text-sm max-w-lg mx-auto">
            A confirmation email has been sent to {formData.email}
        </p>
          <div className="pt-8">
             <Link href="/" className="inline-block bg-brand-forest hover:bg-brand-forest-light border border-accent-gold/30 text-accent-beige px-8 py-3 rounded-lg transition-colors">
               Return Home
             </Link>
          </div>
    </div>
  );
}
