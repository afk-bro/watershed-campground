"use client";

import { useState } from "react";
import { Users, Truck } from "lucide-react";

interface CampsiteParamsStepProps {
    formData: any;
    onChange: (data: any) => void;
    onNext: () => void;
}

export default function CampsiteParamsStep({ formData, onChange, onNext }: CampsiteParamsStepProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...formData, [field]: value });
    };

    const isValid = formData.guests > 0 && formData.unitType;

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center">
                <h2 className="text-2xl font-bold text-[var(--color-accent-gold)]">Who is coming?</h2>
                <p className="text-[var(--color-text-beige)]/70">Tell us about your group and equipment.</p>
            </div>

            <div className="bg-[var(--color-surface-elevated)] p-8 rounded-xl border border-[var(--color-border-subtle)] space-y-8 shadow-xl">
                 {/* Guest Count */}
                 <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Guest Count
                    </label>
                    <div className="flex items-center gap-4">
                        <button 
                            type="button"
                            onClick={() => handleChange('guests', Math.max(1, formData.guests - 1))}
                            className="w-12 h-12 rounded-full border border-[var(--color-border-default)] hover:bg-[var(--color-surface-hover)] text-xl transition-colors"
                        >
                            -
                        </button>
                        <span className="text-2xl font-bold w-12 text-center">{formData.guests}</span>
                        <button 
                             type="button"
                             onClick={() => handleChange('guests', formData.guests + 1)}
                             className="w-12 h-12 rounded-full bg-[var(--color-brand-forest-light)] text-[var(--color-text-inverse)] hover:brightness-110 text-xl transition-all shadow-lg"
                        >
                            +
                        </button>
                    </div>
                 </div>

                 <hr className="border-[var(--color-border-subtle)]" />

                 {/* Unit Type */}
                 <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Camping Unit
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                         {["Tent", "RV / Trailer", "Camper Van", "Cabin"].map(type => (
                             <button
                                key={type}
                                type="button"
                                onClick={() => handleChange('unitType', type)}
                                className={`p-4 rounded-lg border text-left transition-all ${
                                    formData.unitType === type 
                                    ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]' 
                                    : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] text-[var(--color-text-secondary)]'
                                }`}
                             >
                                 <span className="font-medium">{type}</span>
                             </button>
                         ))}
                    </div>
                 </div>

                 {/* RV Length - Conditional */}
                 {(formData.unitType === 'RV / Trailer' || formData.unitType === 'Camper Van') && (
                     <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                            Vehicle Length (ft)
                        </label>
                        <input
                            type="number"
                            value={formData.rvLength || ''}
                            onChange={(e) => handleChange('rvLength', parseInt(e.target.value) || 0)}
                            className="w-full p-4 bg-[var(--color-surface-primary)] border border-[var(--color-border-default)] rounded-lg focus:border-[var(--color-accent-gold)] outline-none transition-colors"
                            placeholder="e.g. 25"
                        />
                     </div>
                 )}
            </div>

            <div className="flex justify-center">
                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className="bg-[var(--color-accent-gold)] text-[var(--color-brand-forest)] px-8 py-4 rounded-full font-bold text-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--color-accent-gold)]/20"
                >
                    Find Campsites
                </button>
            </div>
        </div>
    );
}
