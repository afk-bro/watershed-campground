"use client";

import { Addon, PaymentMethod } from "@/lib/booking/booking-types";

interface AddOnSelectionProps {
  availableAddons: Addon[];
  selectedAddons: Record<string, number>;
  onToggleAddon: (id: string, qty: number) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  depositAmount: string;
  onDepositAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isInitializingPayment: boolean;
}

export default function AddOnSelection({
  availableAddons,
  selectedAddons,
  onToggleAddon,
  paymentMethod,
  onPaymentMethodChange,
  depositAmount,
  onDepositAmountChange,
  onSubmit,
  onBack,
  isInitializingPayment
}: AddOnSelectionProps) {

  return (
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
                                  <button type="button" onClick={() => onToggleAddon(addon.id, Math.max(0, (selectedAddons[addon.id] || 0) - 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xl flex items-center justify-center">-</button>
                                  <span className="w-4 text-center">{selectedAddons[addon.id] || 0}</span>
                                  <button type="button" onClick={() => onToggleAddon(addon.id, (selectedAddons[addon.id] || 0) + 1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xl flex items-center justify-center">+</button>
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
                                 onChange={(e) => onPaymentMethodChange(e.target.value as 'full')}
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
                                 onChange={(e) => onPaymentMethodChange(e.target.value as 'deposit')}
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
                                                 onChange={(e) => onDepositAmountChange(e.target.value)}
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
                                 onChange={(e) => onPaymentMethodChange(e.target.value as 'in-person')}
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
                 <button type="button" onClick={onBack} className="flex-1 py-3 text-accent-beige/60 hover:text-accent-beige border border-white/10 hover:border-white/30 rounded-lg">Back</button>
                 <button type="button" onClick={onSubmit} disabled={isInitializingPayment} className="flex-[2] bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-3 rounded-lg">
                     {isInitializingPayment ? "Calculating..." : (paymentMethod === 'in-person' ? "Reserve Now" : "Review & Pay")}
                 </button>
              </div>
          </div>
      </div>
  );
}
