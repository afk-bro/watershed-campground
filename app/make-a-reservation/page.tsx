"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import Container from "../../components/Container";
import Hero from "../../components/Hero";
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

  // Form Status
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddonToggle = (id: string, qty: number) => {
      setSelectedAddons(prev => ({
          ...prev,
          [id]: qty
      }));
  };

  // Step 1: Form -> Step 2: Add-ons
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2: Add-ons -> Step 3: Review & Pay
  const handleAddonsSubmit = async () => {
    setIsInitializingPayment(true);
    setErrorMessage("");
    
    try {
      const addonsPayload = Object.entries(selectedAddons)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
              const addon = availableAddons.find(a => a.id === id);
              return { id, quantity: qty, price: addon?.price || 0 };
          });

      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            adults: Number(formData.adults),
            children: Number(formData.children),
            addons: addonsPayload,
            campsiteId: formData.campsiteId // PASS CAMPSITE ID
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
              <Hero
                  title="Make a Reservation"
                  subtitle="Find your perfect spot"
                  imageSrc="/gallery/banner.avif"
                  align="center"
              />
              <div className="py-16">
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
      <Hero
        title="Complete Your Booking"
        subtitle="Almost there!"
        imageSrc="/gallery/banner.avif"
        align="center"
      />

      <div className="py-16">
        <Container>
           {/* Stepper */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center text-sm text-accent-beige/60">
              <span className={step >= 1 ? "text-accent-gold font-bold" : ""}>1. Details</span>
              <span className="h-px bg-accent-gold/20 flex-1 mx-4"></span>
              <span className={step >= 2 ? "text-accent-gold font-bold" : ""}>2. Add-ons</span>
              <span className="h-px bg-accent-gold/20 flex-1 mx-4"></span>
              <span className={step >= 3 ? "text-accent-gold font-bold" : ""}>3. Review & Pay</span>
              <span className="h-px bg-accent-gold/20 flex-1 mx-4"></span>
              <span className={step >= 4 ? "text-accent-gold font-bold" : ""}>4. Confirmed</span>
            </div>

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
                   
                   {/* Personal Information */}
                  <section className="space-y-6">
                    <h3 className="font-heading text-2xl text-accent-gold-dark mb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <input type="text" name="address1" placeholder="Address Line 1" value={formData.address1} onChange={handleChange} required className="sm:col-span-2 w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <input type="text" name="address2" placeholder="Address Line 2 (Optional)" value={formData.address2} onChange={handleChange} className="sm:col-span-2 w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} required className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                      <input type="text" name="postalCode" placeholder="Postal Code" value={formData.postalCode} onChange={handleChange} required className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                    </div>
                  </section>

                   {/* Other Info */}
                  <section className="space-y-6">
                     <h3 className="font-heading text-2xl text-accent-gold-dark mb-2">Contact & Other</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} required className="px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige" />
                          <select name="contactMethod" value={formData.contactMethod} onChange={handleChange} required className="px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige">
                              <option value="">Preferred Contact Method</option><option value="Phone">Phone</option><option value="Email">Email</option><option value="Either">Either</option>
                          </select>
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

                  <button type="submit" className="w-full bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-4 rounded-xl transition-all">
                      Continue to Add-ons
                  </button>
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

                     <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-accent-beige/60 hover:text-accent-beige border border-white/10 hover:border-white/30 rounded-lg">Back</button>
                        <button type="button" onClick={handleAddonsSubmit} disabled={isInitializingPayment} className="flex-[2] bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-3 rounded-lg">
                            {isInitializingPayment ? "Calculating..." : "Review & Pay"}
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
                    Thank you, {formData.firstName}. We have received your payment and secured your spot. 
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
