"use client";

import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import Container from "../../components/Container";
import TaskHero from "../../components/TaskHero";
import BookingWizard from "../../components/booking/BookingWizard";
import { useReservationFlow } from "@/hooks/useReservationFlow";
import GuestDetailsForm from "@/components/booking/GuestDetailsForm";
import AddOnSelection from "@/components/booking/AddOnSelection";
import PaymentReview from "@/components/booking/PaymentReview";
import ReservationSuccess from "@/components/booking/ReservationSuccess";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

if (!stripeKey) {
  console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in environment variables.");
}

export default function ReservationPage() {
  const router = useRouter();
  const {
    view,
    setView,
    step,
    setStep,
    formData,
    updateFormData,
    availableAddons,
    selectedAddons,
    toggleAddon,
    paymentMethod,
    setPaymentMethod,
    depositAmount,
    setDepositAmount,
    clientSecret,
    breakdown,
    isInitializingPayment,
    status,
    errorMessage,
    fieldErrors,
    handleWizardComplete,
    validatePersonalInfo,
    proceedToAddons,
    initializePayment,
    submitReservation
  } = useReservationFlow();

  // Step navigation handler
  const handleStepClick = (targetStep: number) => {
    if (targetStep < step && targetStep >= 1 && targetStep <= 3) {
      setStep(targetStep as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handlers bridging hook logic and navigation
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (proceedToAddons()) {
       window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSkipToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePersonalInfo()) {
        const result = await initializePayment();
        if (result && !result.error && !result.skipToStep4) {
             window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (result && result.skipToStep4) {
             // Handle in-person reservation immediate submission
             const response = await submitReservation();
             if (response && response.reservationId) {
                 router.push(`/reservation/confirmation?id=${response.reservationId}`);
             }
        }
    }
  };

  const handleAddonsSubmit = async () => {
     const result = await initializePayment();
     if (result && !result.error) {
         if (result.skipToStep4) {
             const response = await submitReservation();
             if (response && response.reservationId) {
                 router.push(`/reservation/confirmation?id=${response.reservationId}`);
             }
         }
         window.scrollTo({ top: 0, behavior: "smooth" });
     }
  };
  
  const handlePaymentSuccess = async (paymentIntentId: string) => {
      const result = await submitReservation(paymentIntentId);
      if (result && result.reservationId) {
          router.push(`/reservation/confirmation?id=${result.reservationId}`);
      }
  };

  // Wizard View
  if (view === 'wizard') {
      return (
          <main>
              <TaskHero
                  title="Make a Reservation"
                  subtitle="Find your perfect campsite and book your stay"
              />
              <div className="pt-8 pb-12 -mt-4">
                  <Container>
                      <BookingWizard onComplete={handleWizardComplete} />
                  </Container>
              </div>
          </main>
      );
  }

  // Handler to return to wizard (change dates)
  const handleChangeDates = () => {
    setView('wizard');
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Form View orchestrator
  return (
    <main>
      <TaskHero
        title="Complete Your Booking"
        subtitle="Just a few more details and you're all set"
        currentStep={step}
        totalSteps={4}
        stepLabels={['Your Details', 'Add-ons', 'Review & Pay', 'Confirmed']}
        onStepClick={handleStepClick}
      />

      <div className="py-12 -mt-4">
        <Container>
           {errorMessage && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-100 text-sm text-center">
                {errorMessage}
              </div>
           )}

           {step === 1 && (
             <GuestDetailsForm
                formData={formData}
                onChange={updateFormData}
                onSubmit={handleDetailsSubmit}
                onSkip={handleSkipToCheckout}
                onChangeSelection={handleChangeDates}
                fieldErrors={fieldErrors}
             />
           )}
           
           {step === 2 && (
               <AddOnSelection
                   availableAddons={availableAddons}
                   selectedAddons={selectedAddons}
                   onToggleAddon={toggleAddon}
                   paymentMethod={paymentMethod}
                   onPaymentMethodChange={setPaymentMethod}
                   depositAmount={depositAmount}
                   onDepositAmountChange={setDepositAmount}
                   onSubmit={handleAddonsSubmit}
                   onBack={() => {
                        setStep(1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                   }}
                   isInitializingPayment={isInitializingPayment}
               />
           )}

           {step === 3 && (
               <PaymentReview
                   breakdown={breakdown}
                   formData={formData}
                   clientSecret={clientSecret}
                   stripePromise={stripePromise}
                   onSuccess={handlePaymentSuccess}
                   isProcessing={status === "loading"}
                   onBack={() => {
                        setStep(2);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                   }}
               />
           )}

           {step === 4 && (
               <ReservationSuccess
                   formData={formData}
                   paymentMethod={paymentMethod}
               />
           )}
           
        </Container>
      </div>
    </main>
  );
}
