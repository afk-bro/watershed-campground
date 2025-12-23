"use client";
import { Users, Truck } from "lucide-react";

interface CampsiteParamsStepProps {
    formData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    onNext: () => void;
}

export default function CampsiteParamsStep({ formData, onChange, onNext }: CampsiteParamsStepProps) {
    const handleChange = (field: string, value: unknown) => {
        onChange({ ...formData, [field]: value });
    };

    const fd = formData as { guests?: number; unitType?: string; rvLength?: number };
    const guests = Number(fd.guests ?? 0);
    const unitType = fd.unitType as unknown;
    const isValid = Number.isFinite(guests) && guests > 0 && typeof unitType === 'string' && unitType.length > 0;

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
                            onClick={() => handleChange('guests', Math.max(1, (fd.guests ?? 0) - 1))}
                            className="w-12 h-12 rounded-full border border-[var(--color-border-default)] hover:bg-[var(--color-surface-hover)] text-xl transition-colors"
                        >
                            -
                        </button>
                        <span className="text-2xl font-bold w-12 text-center">{fd.guests ?? 0}</span>
                        <button 
                             type="button"
                             onClick={() => handleChange('guests', (fd.guests ?? 0) + 1)}
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
                                    fd.unitType === type 
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
                 {(fd.unitType === 'RV / Trailer' || fd.unitType === 'Camper Van') && (
                     <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                            Vehicle Length
                        </label>

                        {/* Value Display Card */}
                        <div className="flex justify-center">
                            <div className="bg-[var(--color-accent-gold)] text-[var(--color-brand-forest)] px-6 py-3 rounded-xl shadow-lg">
                                <div className="text-3xl font-bold tabular-nums">
                                    {fd.rvLength || 0}<span className="text-xl ml-1">ft</span>
                                </div>
                            </div>
                        </div>

                        {/* Slider Container */}
                        <div className="relative px-2 pt-8 pb-4">
                            {/* Tick marks and labels */}
                            <div className="absolute top-0 left-2 right-2 flex justify-between pointer-events-none">
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((tick) => (
                                    <div key={tick} className="flex flex-col items-center">
                                        <div className="h-3 w-0.5 bg-[var(--color-text-muted)]/30"></div>
                                        <span className="text-[10px] text-[var(--color-text-muted)]/60 mt-1 font-medium">
                                            {tick}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Slider Input */}
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={fd.rvLength || 0}
                                onChange={(e) => handleChange('rvLength', parseInt(e.target.value))}
                                className="w-full h-2 bg-[var(--color-surface-primary)] rounded-lg appearance-none cursor-pointer
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-8
                                    [&::-webkit-slider-thumb]:h-8
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-[var(--color-accent-gold)]
                                    [&::-webkit-slider-thumb]:shadow-lg
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:border-2
                                    [&::-webkit-slider-thumb]:border-[var(--color-brand-forest)]
                                    [&::-webkit-slider-thumb]:transition-transform
                                    [&::-webkit-slider-thumb]:hover:scale-110
                                    [&::-moz-range-thumb]:w-8
                                    [&::-moz-range-thumb]:h-8
                                    [&::-moz-range-thumb]:rounded-full
                                    [&::-moz-range-thumb]:bg-[var(--color-accent-gold)]
                                    [&::-moz-range-thumb]:shadow-lg
                                    [&::-moz-range-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:border-2
                                    [&::-moz-range-thumb]:border-[var(--color-brand-forest)]
                                    [&::-moz-range-thumb]:transition-transform
                                    [&::-moz-range-thumb]:hover:scale-110
                                    [&::-moz-range-thumb]:border-0"
                                style={{
                                    background: `linear-gradient(to right,
                                        var(--color-accent-gold) 0%,
                                        var(--color-accent-gold) ${((fd.rvLength || 0) / 50) * 100}%,
                                        var(--color-surface-primary) ${((fd.rvLength || 0) / 50) * 100}%,
                                        var(--color-surface-primary) 100%)`
                                }}
                            />
                        </div>
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
