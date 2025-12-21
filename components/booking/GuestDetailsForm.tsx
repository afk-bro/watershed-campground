"use client";

import { FormData } from "@/lib/booking/booking-types";
import { format, parseISO } from "date-fns";

interface GuestDetailsFormProps {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: (e: React.FormEvent) => void;
  onChangeSelection: () => void;
  fieldErrors: Record<string, string>;
}

export default function GuestDetailsForm({
  formData,
  onChange,
  onSubmit,
  onSkip,
  onChangeSelection,
  fieldErrors
}: GuestDetailsFormProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
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
            <button type="button" onClick={onChangeSelection} className="text-sm text-[var(--color-accent-gold)] hover:underline">
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
        
        {/* Additional Hidden Fields */}
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
                onClick={onSkip}
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
  );
}
