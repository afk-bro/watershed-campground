"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import Container from "../../components/Container";
import TaskHero from "../../components/TaskHero";
import PaymentForm from "../../components/PaymentForm";
import BookingWizard from "../../components/booking/BookingWizard";
import { format, parseISO } from "date-fns";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

if (!stripeKey) {
  console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in environment variables.");
}

type Addon = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
};

type PaymentBreakdown = {
  totalAmount: number;
  dueNow: number;
  dueLater: number;
  depositAmount: number;
  remainderDueAt: string | null;
  siteTotal: number;
  addonsTotal: number;
  policyApplied?: {
    name: string;
    description?: string;
    policy_type: 'deposit' | 'full';
  };
};

export default function ReservationPage() {
  const [view, setView] = useState<'wizard' | 'form'>('wizard');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Details, 2: Add-ons, 3: Review/Pay, 4: Success
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    rvLength: "",
    rvYear: "",
    adults: "",
    children: "",
    campingUnit: "",
    hearAbout: "",
    contactMethod: "",
    comments: "",
    campsiteId: "", // New field for specific site
  });
  
  // Add-ons State
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({}); // id -> qty

  // Payment State
  const [clientSecret, setClientSecret] = useState("");
  const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'deposit' | 'in-person'>('full');
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Form Status
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
      // Fetch Add-ons on mount
      fetch('/api/addons')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableAddons(data);
        })
        .catch(err => console.error("Failed to load addons", err));
  }, []);

  const handleWizardComplete = (data: any) => {
      setFormData(prev => ({
          ...prev,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: data.guests,
          rvLength: data.rvLength?.toString() || "",
          campingUnit: data.unitType,
          campsiteId: data.selectedSite?.id || ""
      }));
      setView('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleAddonToggle = (id: string, qty: number) => {
      setSelectedAddons(prev => ({
          ...prev,
          [id]: qty
      }));
  };

  // Validate all required fields
  const validatePersonalInfo = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!formData.address1.trim()) {
      errors.address1 = "Address is required";
    }

    if (!formData.city.trim()) {
      errors.city = "City is required";
    }

    if (!formData.postalCode.trim()) {
      errors.postalCode = "Postal code is required";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[\d\s\(\)\-\+]+$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.contactMethod) {
      errors.contactMethod = "Please select your preferred contact method";
    }

    setFieldErrors(errors);

    // Scroll to first error
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(errors).length === 0;
  };

  // Step 1: Form -> Step 2: Add-ons
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePersonalInfo()) {
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Skip add-ons and go directly to checkout
  const skipToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePersonalInfo()) {
      return;
    }

    // Go directly to step 3 (payment/review)
    await handleAddonsSubmit();
  };

  // Step 2: Add-ons -> Step 3: Review & Pay
  const handleAddonsSubmit = async () => {
    setIsInitializingPayment(true);
    setErrorMessage("");

    try {
      // If pay in person, skip payment intent creation
      if (paymentMethod === 'in-person') {
        await handlePayInPersonReservation();
        return;
      }

      const addonsPayload = Object.entries(selectedAddons)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
              const addon = availableAddons.find(a => a.id === id);
              return { id, quantity: qty, price: addon?.price || 0 };
          });

      // For deposit payments, validate and include custom amount
      let customDepositAmount: number | undefined;
      if (paymentMethod === 'deposit') {
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount < 10) {
          throw new Error("Deposit amount must be at least $10");
        }
        customDepositAmount = amount;
      }

      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            adults: Number(formData.adults),
            children: Number(formData.children),
            addons: addonsPayload,
            campsiteId: formData.campsiteId,
            paymentMethod: paymentMethod,
            customDepositAmount: customDepositAmount
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize reservation");
      }

      setClientSecret(data.clientSecret);
      setBreakdown(data.breakdown);

      // Save state to Session Storage
      sessionStorage.setItem("pendingReservation", JSON.stringify({
          formData,
          selectedAddons,
          availableAddons
      }));

      setStep(3); // Review & Pay
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Payment Init Error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to calculate costs.");
    } finally {
      setIsInitializingPayment(false);
    }
  };

  // Handle pay-in-person reservations (no payment required)
  const handlePayInPersonReservation = async () => {
    try {
      const addonsPayload = Object.entries(selectedAddons)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
              const addon = availableAddons.find(a => a.id === id);
              return { id, quantity: qty, price: addon?.price || 0 };
          });

      const response = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           ...formData,
           addons: addonsPayload,
           paymentMethod: 'in-person'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reservation failed");
      }

      setStep(4); // Success
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Reservation error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to create reservation");
      throw error;
    }
  };

  // Step 3 Submit: Payment Success
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setStatus("loading");
    try {
      const addonsPayload = Object.entries(selectedAddons)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
              const addon = availableAddons.find(a => a.id === id);
              return { id, quantity: qty, price: addon?.price || 0 };
          });

      const response = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           ...formData,
           addons: addonsPayload,
           paymentIntentId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reservation failed after payment");
      }

      setStep(4); // Success
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Finalization error:", error);
      setStatus("error");
      setErrorMessage("Payment was successful, but reservation save failed. Please contact us.");
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

  // Form View
  return (
    <main>
      <TaskHero
        title="Complete Your Booking"
        subtitle="Just a few more details and you're all set"
        currentStep={step}
        totalSteps={4}
        stepLabels={['Your Details', 'Add-ons', 'Review & Pay', 'Confirmed']}
      />

      <div className="py-12 -mt-4">
        <Container>

           {errorMessage && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-100 text-sm text-center">
                {errorMessage}
              </div>
           )}

          {step === 1 && (
              <form onSubmit={handleDetailsSubmit} className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-6 sm:p-10 space-y-12">

                   {/* Summary of Selection */}
                   <div className="bg-[var(--color-surface-elevated)] p-4 rounded-lg border border-[var(--color-accent-gold)]/30 flex items-center justify-between">
                       <div>
                           <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">Your Selection</div>
                           <div className="text-[var(--color-text-primary)] font-medium">
                               {formData.checkIn && format(parseISO(formData.checkIn), 'MMM d')} - {formData.checkOut && format(parseISO(formData.checkOut), 'MMM d, yyyy')}
                           </div>
                           <div className="text-sm text-[var(--color-text-muted)]">
                               {formData.campingUnit} • {formData.adults} Guests
                           </div>
                       </div>
                       <button type="button" onClick={() => setView('wizard')} className="text-sm text-[var(--color-accent-gold)] hover:underline">
                           Change
                       </button>
                   </div>

                   {/* Validation Error Summary */}
                   {Object.keys(fieldErrors).length > 0 && (
                       <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                           <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                           <div>
                               <p className="text-red-200 font-medium text-sm">
                                   Please fix the highlighted fields to continue
                               </p>
                           </div>
                       </div>
                   )}
                   
                   {/* Personal Information */}
                  <section className="space-y-6">
                    <h3 className="font-heading text-2xl text-accent-gold-dark mb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.firstName ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                        {fieldErrors.firstName && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.firstName}</p>}
                      </div>
                      <div>
                        <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.lastName ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                        {fieldErrors.lastName && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.lastName}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <input type="text" name="address1" placeholder="Address Line 1" value={formData.address1} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.address1 ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                        {fieldErrors.address1 && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.address1}</p>}
                      </div>
                      <input type="text" name="address2" placeholder="Address Line 2 (Optional)" value={formData.address2} onChange={handleChange} className="sm:col-span-2 w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <div>
                        <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.city ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                        {fieldErrors.city && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.city}</p>}
                      </div>
                      <div>
                        <input type="text" name="postalCode" placeholder="Postal Code" value={formData.postalCode} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.postalCode ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                        {fieldErrors.postalCode && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.postalCode}</p>}
                      </div>
                    </div>
                  </section>

                   {/* Other Info */}
                  <section className="space-y-6">
                     <h3 className="font-heading text-2xl text-accent-gold-dark mb-2">Contact & Other</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.phone ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                            {fieldErrors.phone && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.phone}</p>}
                          </div>
                          <div>
                            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.email ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`} />
                            {fieldErrors.email && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.email}</p>}
                          </div>
                          <div>
                            <select name="contactMethod" value={formData.contactMethod} onChange={handleChange} className={`w-full px-4 py-3 bg-brand-forest/60 border rounded-lg text-accent-beige ${fieldErrors.contactMethod ? 'border-red-400/60 focus:border-red-400' : 'border-accent-gold/30'}`}>
                              <option value="">Preferred Contact Method</option><option value="Phone">Phone</option><option value="Email">Email</option><option value="Either">Either</option>
                            </select>
                            {fieldErrors.contactMethod && <p className="text-red-300 text-sm mt-1.5 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{fieldErrors.contactMethod}</p>}
                          </div>
                          <textarea name="comments" placeholder="Comments..." value={formData.comments} onChange={handleChange} className="sm:col-span-2 px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      </div>
                  </section>
                  
                  {/* Additional Hidden / Readonly Fields to ensure State Persistence */}
                   <div className="hidden">
                       <input type="hidden" name="checkIn" value={formData.checkIn} />
                       <input type="hidden" name="checkOut" value={formData.checkOut} />
                       <input type="hidden" name="adults" value={formData.adults} />
                       <input type="hidden" name="children" value={formData.children} />
                       <input type="hidden" name="unit" value={formData.campingUnit} />
                   </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                      <button
                          type="button"
                          onClick={(e) => skipToCheckout(e as any)}
                          className="flex-1 bg-brand-forest/60 hover:bg-brand-forest/80 text-accent-beige border border-accent-gold/30 hover:border-accent-gold/50 font-medium py-4 rounded-xl transition-all"
                      >
                          Skip to Checkout
                      </button>
                      <button
                          type="submit"
                          className="flex-1 bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-4 rounded-xl transition-all"
                      >
                          Continue to Add-ons
                      </button>
                  </div>
                </div>
              </form>
          )}

          {step === 2 && (
             <div className="max-w-3xl mx-auto">
                 <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-6 sm:p-10 space-y-8">
                     <h3 className="font-heading text-2xl text-accent-gold text-center">Enhance Your Stay</h3>
                     
                     {availableAddons.length === 0 ? (
                         <p className="text-center text-accent-beige/60 italic">No add-ons available at this time.</p>
                     ) : (
                         <div className="grid grid-cols-1 gap-4">
                             {availableAddons.map(addon => (
                                 <div key={addon.id} className="flex items-center justify-between p-4 bg-brand-forest/50 border border-accent-gold/20 rounded-lg">
                                     <div>
                                         <h4 className="font-bold text-accent-beige">{addon.name}</h4>
                                         <p className="text-sm text-accent-beige/60">{addon.description}</p>
                                         <p className="text-accent-gold font-medium mt-1">${addon.price.toFixed(2)}</p>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button type="button" onClick={() => handleAddonToggle(addon.id, Math.max(0, (selectedAddons[addon.id] || 0) - 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xl flex items-center justify-center">-</button>
                                         <span className="w-4 text-center">{selectedAddons[addon.id] || 0}</span>
                                         <button type="button" onClick={() => handleAddonToggle(addon.id, (selectedAddons[addon.id] || 0) + 1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xl flex items-center justify-center">+</button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}

                     {/* Payment Method Selection */}
                     <div className="border-t border-white/10 pt-6 mt-6">
                        <h4 className="font-heading text-xl text-accent-gold mb-4">Payment Method</h4>
                        <div className="space-y-3">
                            {/* Pay in Full */}
                            <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'full' ? 'border-accent-gold bg-accent-gold/10' : 'border-white/10 hover:border-white/20'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="full"
                                        checked={paymentMethod === 'full'}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'full')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-accent-beige">Pay in Full</div>
                                        <div className="text-sm text-accent-beige/60">Pay the full amount now with credit card</div>
                                    </div>
                                </div>
                            </label>

                            {/* Pay Deposit */}
                            <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'deposit' ? 'border-accent-gold bg-accent-gold/10' : 'border-white/10 hover:border-white/20'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="deposit"
                                        checked={paymentMethod === 'deposit'}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'deposit')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-accent-beige">Pay Deposit</div>
                                        <div className="text-sm text-accent-beige/60 mb-2">Pay a deposit now, remainder later (minimum $10)</div>
                                        {paymentMethod === 'deposit' && (
                                            <div className="mt-2">
                                                <label htmlFor="depositAmount" className="block text-sm text-accent-beige/80 mb-1">
                                                    Deposit Amount:
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-accent-gold">$</span>
                                                    <input
                                                        id="depositAmount"
                                                        type="number"
                                                        min="10"
                                                        step="1"
                                                        value={depositAmount}
                                                        onChange={(e) => setDepositAmount(e.target.value)}
                                                        placeholder="10"
                                                        className="flex-1 px-3 py-2 bg-brand-forest border border-accent-gold/30 rounded text-accent-beige focus:border-accent-gold focus:outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </label>

                            {/* Pay in Person */}
                            <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'in-person' ? 'border-accent-gold bg-accent-gold/10' : 'border-white/10 hover:border-white/20'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="in-person"
                                        checked={paymentMethod === 'in-person'}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'in-person')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-accent-beige">Pay in Person</div>
                                        <div className="text-sm text-accent-beige/60">Reserve now, pay when you arrive (cash or card)</div>
                                    </div>
                                </div>
                            </label>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-accent-beige/60 hover:text-accent-beige border border-white/10 hover:border-white/30 rounded-lg">Back</button>
                        <button type="button" onClick={handleAddonsSubmit} disabled={isInitializingPayment} className="flex-[2] bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-3 rounded-lg">
                            {isInitializingPayment ? "Calculating..." : (paymentMethod === 'in-person' ? "Reserve Now" : "Review & Pay")}
                        </button>
                     </div>
                 </div>
             </div>
          )}

          {step === 3 && (
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
                                onSuccess={handlePaymentSuccess}
                                isProcessing={status === "loading"}
                             />
                         </Elements>
                     )}
                     
                     <div className="text-center pt-4">
                        <button type="button" onClick={() => setStep(2)} className="text-sm text-accent-beige/50 hover:text-accent-gold underline">
                            Go Back to Add-ons
                        </button>
                     </div>
                 </div>
             </div>
          )}

          {step === 4 && (
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
                     <a href="/" className="inline-block bg-brand-forest hover:bg-brand-forest-light border border-accent-gold/30 text-accent-beige px-8 py-3 rounded-lg transition-colors">
                        Return Home
                     </a>
                </div>
            </div>
          )}

        </Container>
      </div>
    </main>
  );
}
